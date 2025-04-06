import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Badge,
  LinearProgress,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  Code as CodeIcon, 
  ExpandMore as ExpandMoreIcon,
  TaskAlt as TaskIcon,
  Message as MessageIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

export default function AgentLog() {
  const { chatHistory, agentLogs } = useContext(AppContext);
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Extract important agent information
  const extractAgentState = (log) => {
    if (!log) return { status: 'Unknown', progress: 0 };
    
    // Check if emotion analysis exists
    const hasEmotion = log.mood || false;
    
    // Check if content was curated - handle both content structures
    const contentObj = log.content || {};
    const nestedContent = contentObj.content || contentObj;
    
    const hasContent = !!(
      nestedContent.video?.url || 
      nestedContent.video?.title ||
      nestedContent.music?.url || 
      nestedContent.music?.title ||
      (nestedContent.news && nestedContent.news.length > 0) ||
      (nestedContent.context_keyphrases && nestedContent.context_keyphrases.length > 0)
    );
    
    // Check if journal was generated
    const hasJournal = log.journal && (typeof log.journal === 'string' ? log.journal.length > 15 : true);
    
    // Check if response was generated
    const hasResponse = !!log.response;
    
    // Calculate progress based on tasks completed
    let progress = 0;
    if (hasEmotion) progress += 25;
    if (hasContent) progress += 25;
    if (hasJournal) progress += 25;
    if (hasResponse) progress += 25;
    
    // Determine current state based on status or progress
    let status = 'Idle';
    if (log.status === 'complete') {
      status = 'Complete';
    } else if (log.status === 'in-progress') {
      status = 'Processing';
    } else if (progress === 0) {
      status = 'Pending';
    } else if (progress < 25) {
      status = 'Analyzing';
    } else if (progress < 75) {
      status = 'Processing';
    } else if (progress < 100) {
      status = 'Finalizing';
    } else {
      status = 'Complete';
    }
    
    return { 
      status, 
      progress,
      hasEmotion,
      hasContent,
      hasJournal,
      hasResponse
    };
  };

  // Process agent logs to match with chat history
  const processLogs = () => {
    // First, create a map of timestamps to agent logs for quick lookup
    const logMap = {};
    agentLogs.forEach(log => {
      if (log.timestamp) {
        logMap[log.timestamp] = log;
      }
    });
    
    // Then create logs for each AURA message in chat history
    return chatHistory.map((msg, index) => {
      // Only create logs for AURA responses
      if (msg.sender !== "AURA") return null;
      
      // Try to find matching log by timestamp or use the log at same index position
      let matchedLog = null;
      if (msg.timestamp && logMap[msg.timestamp]) {
        matchedLog = logMap[msg.timestamp];
      } else {
        // Count how many AURA messages came before this one
        const auraMessageCount = chatHistory.slice(0, index)
          .filter(m => m.sender === "AURA").length;
        
        // Use that count to find the corresponding log
        if (auraMessageCount < agentLogs.length) {
          matchedLog = agentLogs[auraMessageCount];
        }
      }
      
      // If no match found, create a basic log with the message text
      const agentLog = matchedLog || { 
        response: msg.text,
        mood: msg.mood,
        timestamp: msg.timestamp
      };
      
      const state = extractAgentState(agentLog);
      
      return {
        timestamp: msg.timestamp,
        content: agentLog,
        state: state,
        id: `log-${index}`
      };
    }).filter(log => log !== null);
  };

  const logs = processLogs();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
        Agent Communication Log
      </Typography>
      
      {logs && logs.length > 0 ? (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2, 
                  borderRadius: '12px',
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(90deg, #2c3e50 0%, #1a2530 100%)'
                    : 'linear-gradient(90deg, #3f78bf 0%, #5592e8 100%)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Agent System Overview
                </Typography>
                <Typography variant="body2">
                  AURA uses a multi-agent system to process emotions, curate content, and generate responses.
                </Typography>
                <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<PsychologyIcon />} 
                    label="Emotional Analysis" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  <Chip 
                    icon={<TaskIcon />} 
                    label="Content Curation" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  <Chip 
                    icon={<MessageIcon />} 
                    label="HER-Style Response" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                  <Chip 
                    icon={<AnalyticsIcon />} 
                    label="Journal Creation" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {logs.map((log, index) => (
            <Accordion 
              key={log.id} 
              expanded={expanded === log.id}
              onChange={handleAccordionChange(log.id)}
              sx={{ 
                mb: 2, 
                borderRadius: '8px',
                overflow: 'hidden',
                '&:before': { display: 'none' },
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)' 
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                  <Badge 
                    color={log.state.progress === 100 ? "success" : "info"} 
                    variant="dot"
                  >
                    <CodeIcon />
                  </Badge>
                  <Typography sx={{ flex: 1, fontWeight: 500 }}>
                    {new Date(log.timestamp).toLocaleTimeString()} - Agent Response
                  </Typography>
                  <Chip 
                    size="small" 
                    label={log.state.status}
                    color={log.state.progress === 100 ? "success" : "primary"}
                    sx={{ minWidth: 90 }}
                  />
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 0 }}>
                <Box p={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Agent Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={log.state.progress} 
                    sx={{ height: 8, borderRadius: 4, mb: 2 }}
                  />
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: log.state.hasEmotion 
                            ? 'rgba(76, 175, 80, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Tooltip title="Emotional analysis">
                          <PsychologyIcon 
                            color={log.state.hasEmotion ? "success" : "disabled"}
                            sx={{ mb: 1 }}
                          />
                        </Tooltip>
                        <Typography variant="caption" display="block">
                          Emotion: {log.content.mood || "Unknown"}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: log.state.hasContent 
                            ? 'rgba(33, 150, 243, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Tooltip title="Content curation">
                          <TaskIcon 
                            color={log.state.hasContent ? "primary" : "disabled"} 
                            sx={{ mb: 1 }}
                          />
                        </Tooltip>
                        <Typography variant="caption" display="block">
                          Content: {log.state.hasContent ? "Curated" : "None"}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: log.state.hasJournal 
                            ? 'rgba(156, 39, 176, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Tooltip title="Journal generation">
                          <AnalyticsIcon 
                            color={log.state.hasJournal ? "secondary" : "disabled"} 
                            sx={{ mb: 1 }}
                          />
                        </Tooltip>
                        <Typography variant="caption" display="block">
                          Journal: {log.state.hasJournal ? "Created" : "None"}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: log.state.hasResponse 
                            ? 'rgba(255, 87, 34, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Tooltip title="Response generation">
                          <MessageIcon 
                            color={log.state.hasResponse ? "warning" : "disabled"} 
                            sx={{ mb: 1 }}
                          />
                        </Tooltip>
                        <Typography variant="caption" display="block">
                          Response: {log.state.hasResponse ? "Generated" : "Pending"}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Communication Log
                  </Typography>
                  
                  <List 
                    dense 
                    sx={{ 
                      maxHeight: 200, 
                      overflow: 'auto',
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.01)',
                      borderRadius: 1,
                      mb: 2
                    }}
                  >
                    {log.content.mood && (
                      <ListItem>
                        <ListItemText 
                          primary="Emotion Analysis" 
                          secondary={`Detected mood: ${log.content.mood} (Confidence: ${log.content.confidence || 'Medium'})`} 
                        />
                      </ListItem>
                    )}
                    
                    {/* Handle both nested and non-nested content structures */}
                    {(() => {
                      const contentObj = log.content.content || log.content;
                      return (
                        contentObj.video && contentObj.video.title && (
                          <ListItem>
                            <ListItemText 
                              primary="Content Curator" 
                              secondary={`Video: ${contentObj.video.title || 'No title'}`} 
                            />
                          </ListItem>
                        )
                      );
                    })()}
                    
                    {(() => {
                      const contentObj = log.content.content || log.content;
                      return (
                        contentObj.music && contentObj.music.title && (
                          <ListItem>
                            <ListItemText 
                              primary="Content Curator" 
                              secondary={`Music: ${contentObj.music.title || 'No title'}`} 
                            />
                          </ListItem>
                        )
                      );
                    })()}
                    
                    {(() => {
                      const contentObj = log.content.content || log.content;
                      return (
                        contentObj.news && contentObj.news.length > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="Content Curator" 
                              secondary={`News articles: ${contentObj.news.length} found`} 
                            />
                          </ListItem>
                        )
                      );
                    })()}
                    
                    {(() => {
                      const contentObj = log.content.content || log.content;
                      return (
                        contentObj.context_keyphrases && contentObj.context_keyphrases.length > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="Content Curator" 
                              secondary={`Key phrases: ${contentObj.context_keyphrases.length} identified`} 
                            />
                          </ListItem>
                        )
                      );
                    })()}
                    
                    {log.content.journal && (
                      <ListItem>
                        <ListItemText 
                          primary="Journal Generator" 
                          secondary={`Journal entry created (${
                            typeof log.content.journal === 'string' 
                              ? log.content.journal.length 
                              : 'Object'
                          } characters)`} 
                        />
                      </ListItem>
                    )}
                    
                    {log.content.response && (
                      <ListItem>
                        <ListItemText 
                          primary="Response Generator" 
                          secondary="Final response created and delivered" 
                        />
                      </ListItem>
                    )}
                  </List>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Raw Data
                  </Typography>
                  <Paper 
                    sx={{ 
                      p: 0, 
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <pre 
                      style={{ 
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(0,0,0,0.2)' 
                          : 'rgba(0,0,0,0.03)', 
                        padding: '1rem', 
                        margin: 0,
                        overflowX: 'auto',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        borderRadius: '4px'
                      }}
                    >
                      {JSON.stringify(log.content, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          opacity: 0.7 
        }}>
          <CodeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.7 }} />
          <Typography variant="h6">No agent data available</Typography>
          <Typography variant="body2" color="text.secondary">
            Agent logs will appear when you chat with AURA
          </Typography>
        </Box>
      )}
    </Box>
  );
}
