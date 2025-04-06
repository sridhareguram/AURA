import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AppContext = createContext();

export function AppProvider({ children }) {
  // Application Core State
  const [chatHistory, setChatHistory] = useState([]);
  const [moodHistory, setMoodHistory] = useState([]);
  const [journalEntry, setJournalEntry] = useState(""); // Keep for backward compatibility
  const [journalEntries, setJournalEntries] = useState([]); // New structured format
  const [curatedContent, setCuratedContent] = useState({
    video: null,
    music: null,
    news: []
  });
  const [agentLogs, setAgentLogs] = useState([]);

 
  // Player State
  const [spotifyToken, setSpotifyToken] = useState("");
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  const [spotifyError, setSpotifyError] = useState(null);

  // Token Management
  useEffect(() => {
    const handleTokenFromURL = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');

      if (accessToken && expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_token_expiry', expiryTime);
        setSpotifyToken(accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleTokenFromURL();

    const storedToken = localStorage.getItem('spotify_access_token');
    const storedExpiry = localStorage.getItem('spotify_token_expiry');

    if (storedToken && storedExpiry && Date.now() < storedExpiry) {
      setSpotifyToken(storedToken);
    }
  }, []);

  // Initialize Spotify Player
  useEffect(() => {
    if (!spotifyToken) return;

    const initializePlayer = () => {
      if (!window.Spotify) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        const newPlayer = new window.Spotify.Player({
          name: 'AURA Companion',
          getOAuthToken: cb => cb(spotifyToken),
          volume: 0.7
        });

        newPlayer.addListener('ready', ({ device_id }) => {
          setDeviceId(device_id);
          setIsSpotifyReady(true);
          setSpotifyError(null);
        });

        newPlayer.addListener('not_ready', () => setIsSpotifyReady(false));
        newPlayer.addListener('initialization_error', ({ message }) =>
          setSpotifyError(`Player Error: ${message}`)
        );
        newPlayer.addListener('authentication_error', ({ message }) => {
          setSpotifyError(`Auth Error: ${message}`);
          handleSpotifyLogout();
        });
        newPlayer.addListener('playback_error', ({ message }) =>
          setSpotifyError(`Playback Error: ${message}`)
        );

        newPlayer.connect();
        setPlayer(newPlayer);
      };
    };

    initializePlayer();

    return () => {
      if (player) {
        player.disconnect();
        setPlayer(null);
      }
    };
  }, [spotifyToken]);

  // Auth Methods
  const connectSpotify = async () => {
    try {
      const response = await axios.get("http://localhost:8000/spotify-auth");
      if (response.data && response.data.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      console.error("Error fetching Spotify auth URL:", error);
    }
  };

  const handleSpotifyLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    setSpotifyToken("");
    setDeviceId(null);
    setIsSpotifyReady(false);
  };

  // Playback Control
  const playTrack = async (uri) => {
    if (!deviceId || !spotifyToken) return;
    
    try {
      await axios.put(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        { uris: [uri] },
        { headers: { Authorization: `Bearer ${spotifyToken}` } }
      );
    } catch (error) {
      setSpotifyError(error.response?.data?.error?.message || 'Playback failed');
      if (error.response?.status === 401) handleSpotifyLogout();
    }
  };

  // Existing State Management - Updated to include journal entries
  useEffect(() => {
    const savedChat = localStorage.getItem('aura_chat');
    const savedMood = localStorage.getItem('aura_mood');
    const savedJournal = localStorage.getItem('aura_journal');
    const savedJournalEntries = localStorage.getItem('aura_journal_entries');
    const savedLogs = localStorage.getItem('aura_logs');

    if (savedChat) setChatHistory(JSON.parse(savedChat));
    if (savedMood) setMoodHistory(JSON.parse(savedMood));
    if (savedJournal) setJournalEntry(savedJournal);
    if (savedJournalEntries) setJournalEntries(JSON.parse(savedJournalEntries));
    if (savedLogs) setAgentLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_chat', JSON.stringify(chatHistory));
    localStorage.setItem('aura_mood', JSON.stringify(moodHistory));
    localStorage.setItem('aura_journal', journalEntry);
    localStorage.setItem('aura_journal_entries', JSON.stringify(journalEntries));
    localStorage.setItem('aura_logs', JSON.stringify(agentLogs));
  }, [chatHistory, moodHistory, journalEntry, journalEntries, agentLogs]);

  const addChatMessage = (message) => {
    setChatHistory(prev => [...prev, message]);
  };

  const addMood = (mood, timestamp) => {
    if (mood) setMoodHistory(prev => [...prev, { mood, timestamp }]);
  };

  // Updated to handle both formats
  const updateJournalEntry = (entry, entries = null) => {
    if (entry) setJournalEntry(entry);
    if (entries) {
      // Sort entries by timestamp (newest first)
      const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      setJournalEntries(sortedEntries);
    }
  };

  const updateCuratedContent = (content) => {
    if (content) setCuratedContent(content);
  };

  // Enhanced updateAgentLog for real-time agent state visualization
  const updateAgentLog = (data) => {
    if (!data) return;
    
    // Find if there's a recent log entry that should be updated instead of creating a new one
    // We'll consider entries from the last 10 seconds as candidates for update
    const now = new Date();
    const recentTimestamp = new Date(now.getTime() - 10000); // 10 seconds ago
    
    // Extract agent status information
    const agentStatus = {
      timestamp: data.timestamp || new Date().toISOString(),
      mood: data.mood || "neutral",
      confidence: parseFloat(data.confidence) || 0,
      status: getCompletionStatus(data),
      response: data.response,
      content: data.content,
      journal: data.journal,
      
      // Extract individual agent information
      agentDetails: {
        emotionAnalyzer: {
          status: data.mood ? "complete" : "pending",
          output: data.mood ? `Detected mood: ${data.mood}` : "No emotion detected",
          confidence: data.confidence || 0
        },
        contentCurator: {
          status: hasContent(data) ? "complete" : "pending",
          output: getContentDescription(data)
        },
        journalAgent: {
          status: data.journal ? "complete" : "pending",
          output: data.journal ? "Journal entry created" : "No journal entry"
        },
        responseGenerator: {
          status: data.response ? "complete" : "pending",
          output: data.response ? "Final response created and delivered" : "No response generated"
        }
      },
      
      // Progress calculation (25% for each completed agent)
      progress: calculateProgress(data)
    };
    
    // Check if we should update an existing log or add a new one
    setAgentLogs(prev => {
      const recentLogIndex = prev.findIndex(log => {
        // Try to match by timestamp if available
        if (data.timestamp && log.timestamp === data.timestamp) {
          return true;
        }
        
        // Otherwise, look for a recent log entry that's not complete
        const logTime = new Date(log.timestamp);
        return logTime > recentTimestamp && log.status !== "complete";
      });
      
      if (recentLogIndex >= 0) {
        // Update existing log
        const updatedLogs = [...prev];
        updatedLogs[recentLogIndex] = agentStatus;
        return updatedLogs;
      } else {
        // Add new log
        return [...prev, agentStatus];
      }
    });
  };
  
  // Helper functions for updateAgentLog
  const getCompletionStatus = (data) => {
    const hasEmotions = !!data.mood;
    const hasContentData = hasContent(data);
    const hasJournal = !!data.journal;
    const hasResponse = !!data.response;
    
    if (hasEmotions && hasContentData && hasJournal && hasResponse) {
      return "complete";
    } else if (hasEmotions || hasContentData || hasJournal || hasResponse) {
      return "in-progress";
    } else {
      return "pending";
    }
  };
  
  const hasContent = (data) => {
    const content = data.content || {};
    return !!(
      content.video?.title || 
      content.video?.url || 
      content.music?.title || 
      content.music?.url || 
      (content.news && content.news.length > 0) ||
      (content.context_keyphrases && content.context_keyphrases.length > 0)
    );
  };
  
  const getContentDescription = (data) => {
    const content = data.content || {};
    
    if (content.video?.title) {
      return `Video found: ${content.video.title}`;
    } else if (content.music?.title) {
      return `Music found: ${content.music.title}`;
    } else if (content.news && content.news.length > 0) {
      return `News articles found: ${content.news.length}`;
    } else if (content.context_keyphrases && content.context_keyphrases.length > 0) {
      return `Key phrases identified: ${content.context_keyphrases.length}`;
    } else {
      return "No content curated";
    }
  };
  
  const calculateProgress = (data) => {
    let progress = 0;
    
    if (data.mood) progress += 25;
    if (hasContent(data)) progress += 25;
    if (data.journal) progress += 25;
    if (data.response) progress += 25;
    
    return progress;
  };

  const clearHistory = () => {
    setChatHistory([]);
    setMoodHistory([]);
    setJournalEntry("");
    setJournalEntries([]);
    setCuratedContent({ video: null, music: null, news: [] });
    setAgentLogs([]);
    localStorage.removeItem('aura_chat');
    localStorage.removeItem('aura_mood');
    localStorage.removeItem('aura_journal');
    localStorage.removeItem('aura_journal_entries');
    localStorage.removeItem('aura_logs');
  };

  const clearAllHistory = async () => {
    if (window.confirm("Clear all conversation history and memory?")) {
      try {
        await axios.post('http://localhost:8000/reset-memory');
        clearHistory();
      } catch (error) {
        console.error("Error resetting memory:", error);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        chatHistory,
        moodHistory,
        journalEntry,
        journalEntries,
        curatedContent,
        agentLogs,
        addChatMessage,
        addMood,
        updateJournalEntry,
        updateCuratedContent,
        updateAgentLog,
        clearHistory,
        clearAllHistory,
        spotifyToken,
        isSpotifyReady,
        spotifyError,
        playTrack,
        connectSpotify
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
