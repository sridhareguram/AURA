import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Box, TextField, Button, List, ListItem, Avatar, Paper, Typography, IconButton } from '@mui/material';
import { Send as SendIcon, Mic as MicIcon, MicOff as MicOffIcon, VolumeUp as VolumeUpIcon } from '@mui/icons-material';
import axios from 'axios';

export default function Chat() {
  const [input, setInput] = useState("");
  const { chatHistory, addChatMessage, addMood, updateJournalEntry, updateCuratedContent, updateAgentLog } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messageListRef = useRef(null);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Simulate speaking audio wave animation
  useEffect(() => {
    if (loading) {
      setIsSpeaking(true);
      const timer = setTimeout(() => setIsSpeaking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { 
      sender: "User", 
      text: input, 
      timestamp: new Date().toISOString() 
    };
    
    addChatMessage(userMessage);
    setLoading(true);
    setInput("");
    
    try {
      const response = await axios.post("http://localhost:8000/chat", { 
        user_input: input 
      });
      
      // Handle backend response
      if (response.data) {
        addChatMessage({ 
          sender: "AURA", 
          text: response.data.response, 
          timestamp: response.data.timestamp || new Date().toISOString(),
          mood: response.data.mood || "neutral"
        });

        // Update mood history with proper timestamp
        if (response.data.mood) {
          addMood(response.data.mood, response.data.timestamp || new Date().toISOString());
        }

        // Update journal entry with new structured format
        if (response.data.journal || response.data.journal_entries) {
          updateJournalEntry(
            response.data.journal,
            response.data.journal_entries
          );
        }

        // Update curated content with validation
        if (response.data.content) {
          updateCuratedContent({
            video: response.data.content.video || {},
            music: response.data.content.music || {},
            news: response.data.content.news || [],
            context_keyphrases: response.data.content.context_keyphrases || []
          });
        }

        // Enhanced agent logging
        updateAgentLog({
          timestamp: response.data.timestamp,
          mood: response.data.mood,
          confidence: response.data.confidence,
          status: response.data.status,
          content: response.data.content,
          journal: response.data.journal,
          response: response.data.response
        });
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      addChatMessage({ 
        sender: "AURA", 
        text: "I'm having trouble responding... Let's try again.", 
        timestamp: new Date().toISOString(),
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input not supported in this browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Enhanced audio wave animation component
  const AudioWave = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: `${Math.random() * 24 + 8}px`,
            bgcolor: 'secondary.main',
            mx: 0.5,
            borderRadius: 2,
            animation: 'wave 1.2s ease infinite',
            animationDelay: `${i * 0.1}s`,
            '@keyframes wave': {
              '0%, 100%': { transform: 'scaleY(0.5)' },
              '50%': { transform: 'scaleY(2)' }
            }
          }}
        />
      ))}
    </Box>
  );

  const handleTextToSpeech = (text) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech not supported in this browser");
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      <Typography variant="h6" sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        Conversation with AURA
      </Typography>

      <List ref={messageListRef} sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        '&::-webkit-scrollbar': {
          width: '6px'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: '3px'
        }
      }}>
        {chatHistory.map((msg, index) => (
          <ListItem key={index} sx={{ 
            flexDirection: msg.sender === 'User' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            my: 1.5,
            transition: 'transform 0.2s',
            ':hover': {
              transform: 'translateX(5px)'
            }
          }}>
            <Avatar sx={{ 
              bgcolor: msg.sender === 'User' ? 'primary.main' : 'secondary.main',
              mx: 1.5,
              width: 40,
              height: 40,
              fontSize: '0.9rem'
            }}>
              {msg.sender === 'User' ? 'You'[0] : 'AI'[0]}
            </Avatar>
            
            <Paper sx={{
              p: 2,
              maxWidth: '70%',
              borderRadius: msg.sender === 'User' 
                ? '18px 4px 18px 18px' 
                : '4px 18px 18px 18px',
              bgcolor: msg.sender === 'User' 
                ? 'primary.light' 
                : 'background.paper',
              color: msg.sender === 'User' ? 'primary.contrastText' : 'text.primary',
              boxShadow: 1,
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                width: 0,
                height: 0,
                borderStyle: 'solid',
                [msg.sender === 'User' ? 'right' : 'left']: '-10px',
                top: '12px',
                borderWidth: '10px 0 10px 10px',
                borderColor: `transparent transparent transparent ${msg.sender === 'User' ? 
                  (theme) => theme.palette.primary.light : 
                  (theme) => theme.palette.background.paper}`
              }
            }}>
              <Typography variant="body1" sx={{ 
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {msg.text}
              </Typography>
              <Typography variant="caption" display="block" sx={{ 
                mt: 1, 
                textAlign: 'right',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5
              }}>
                {msg.mood && (
                  <Typography variant="inherit" sx={{ 
                    color: msg.mood === 'happy' ? 'success.main' : 
                           msg.mood === 'sad' ? 'error.main' : 
                           'text.secondary' 
                  }}>
                    {msg.mood}
                  </Typography>
                )}
                {new Date(msg.timestamp).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
                
                {msg.sender === 'AURA' && (
                  <IconButton 
                    size="small" 
                    onClick={() => handleTextToSpeech(msg.text)}
                    disabled={isSpeaking}
                    sx={{ ml: 1 }}
                  >
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
                )}
              </Typography>
            </Paper>
          </ListItem>
        ))}
        
        {loading && <AudioWave />}
      </List>

      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider', 
        bgcolor: 'background.paper',
        position: 'sticky',
        bottom: 0
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Share your thoughts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                bgcolor: 'background.default',
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper'
                }
              }
            }}
          />
          
          <IconButton 
            onClick={handleVoiceInput} 
            color={isListening ? 'secondary' : 'default'}
            sx={{
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            {isListening ? (
              <MicOffIcon sx={{ color: 'error.main' }} />
            ) : (
              <MicIcon />
            )}
          </IconButton>
          
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            endIcon={<SendIcon />}
            sx={{ 
              borderRadius: 4,
              px: 3,
              textTransform: 'none',
              fontWeight: 500,
              letterSpacing: 0.5
            }}
          >
            {loading ? 'Processing...' : 'Send'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
