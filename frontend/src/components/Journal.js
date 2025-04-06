import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Box, Typography, Paper, Divider, Chip, CircularProgress } from '@mui/material';
import { Book as BookIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import axios from 'axios';

export default function Journal() {
  // Application context for journal data
  const { journalEntry, journalEntries, updateJournalEntry } = useContext(AppContext);
  
  // Local component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedData, setFetchedData] = useState(false);

  // One-time journal fetching on component mount
  useEffect(() => {
    // Guard against re-fetching or async race conditions
    if (fetchedData) return;
    
    let isMounted = true;
    setLoading(true);
    
    // Separate function to handle the API call
    const getJournalEntries = async () => {
      try {
        const response = await axios.get('/api/journal');
        
        // Only update state if component is still mounted
        if (isMounted) {
          if (response.data && Array.isArray(response.data)) {
            // Update context with the journal entries
            updateJournalEntry(null, response.data);
            setFetchedData(true);
          }
          setLoading(false);
        }
      } catch (err) {
        // Only update error state if component is still mounted
        if (isMounted) {
          console.error('Error fetching journal history:', err);
          setError('Failed to load journal entries');
          setLoading(false);
          setFetchedData(true); // Mark as fetched even on error
        }
      }
    };

    // Execute the fetch
    getJournalEntries();
    
    // Cleanup function to handle unmounting
    return () => {
      isMounted = false;
    };
  }, [fetchedData]); // Only depend on fetchedData state

  // Split journal entry into structured sections
  const renderJournalContent = (entry) => {
    if (!entry) return null;
    
    return entry.split('\n').map((line, index) => {
      const isHeader = line.match(/[📅🗓️📆✨🌙]/);
      const isSection = line.match(/[💡🪞🌱❓]/);
      const isEmptyLine = line.trim() === '';

      return (
        <React.Fragment key={index}>
          {isEmptyLine ? (
            <Divider sx={{ my: 2 }} />
          ) : isHeader ? (
            <Typography 
              variant="h6"
              sx={{
                fontFamily: 'Georgia, serif',
                color: 'primary.main',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {line}
            </Typography>
          ) : isSection ? (
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'Georgia, serif',
                fontWeight: 600,
                color: 'text.secondary',
                mt: 3,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              {line}
            </Typography>
          ) : (
            <Typography 
              component="p"
              variant="body1"
              sx={{
                fontFamily: 'Georgia, serif',
                lineHeight: 1.8,
                letterSpacing: 0.3,
                color: 'rgba(0, 0, 0, 0.8)',
                mb: 2,
                textAlign: 'justify'
              }}
            >
              {line}
            </Typography>
          )}
        </React.Fragment>
      );
    });
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return "";
    }
  };

  // Check if we have structured entries
  const hasEntries = journalEntries && journalEntries.length > 0;

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: 3
    }}>
      <Typography variant="h5" sx={{ 
        mb: 3, 
        fontWeight: 600,
        color: 'primary.dark',
        fontFamily: 'Georgia, serif'
      }}>
        Daily Reflections
      </Typography>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          gap: 2
        }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Loading journal entries...
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          color: 'error.main'
        }}>
          <Typography variant="body1">{error}</Typography>
        </Box>
      ) : (hasEntries || journalEntry) ? (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {hasEntries ? (
            // Display structured journal entries
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {journalEntries.map((entry, index) => (
                <Paper 
                  key={entry.id || index}
                  elevation={0}
                  sx={{ 
                    borderRadius: '16px',
                    background: 'linear-gradient(145deg, #f8f5ff 0%, #ffffff 100%)',
                    p: 4,
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  {entry.timestamp && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(entry.timestamp)}
                        </Typography>
                      </Box>
                      
                      {entry.mood && (
                        <Chip 
                          label={entry.mood} 
                          size="small"
                          color={
                            entry.mood === 'happy' || entry.mood === 'excited' ? 'success' : 
                            entry.mood === 'sad' || entry.mood === 'anxious' ? 'error' : 
                            'default'
                          }
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                  {renderJournalContent(entry.entry)}
                </Paper>
              ))}
            </Box>
          ) : (
            // Fall back to legacy format
            <Paper 
              elevation={0}
              sx={{ 
                borderRadius: '16px',
                background: 'linear-gradient(145deg, #f8f5ff 0%, #ffffff 100%)',
                p: 4,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              {renderJournalContent(journalEntry)}
            </Paper>
          )}
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          gap: 2,
          opacity: 0.6
        }}>
          <BookIcon sx={{ 
            fontSize: 80, 
            color: 'primary.main', 
            opacity: 0.5 
          }} />
          <Typography variant="h6" color="text.secondary">
            Your personal journal is empty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Meaningful reflections will appear here after conversations
          </Typography>
        </Box>
      )}
    </Box>
  );
}
