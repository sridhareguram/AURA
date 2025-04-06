import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Tabs, 
  Tab, 
  Box, 
  Typography, 
  Toolbar, 
  Paper,
  ThemeProvider,
  createTheme,
  IconButton,
  useMediaQuery,
  Drawer,
  Badge,
  Tooltip,
  Button
} from '@mui/material';
import {
  Mood as MoodIcon,
  LibraryMusic as MusicIcon,
  Book as JournalIcon,
  Code as CodeIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  MicNone as MicIcon
} from '@mui/icons-material';
import Chat from './Chat';
import MoodTracker from './MoodTracker';
import ContentFeed from './ContentFeed';
import AgentLog from './AgentLog';
import Journal from './Journal';
import { AppContext } from '../context/AppContext';

// Create custom theme with improved dark mode support
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#3f78bf' : '#5592e8',
      light: mode === 'light' ? '#5592e8' : '#70a9ff',
      dark: mode === 'light' ? '#2c5a96' : '#3f78bf',
    },
    secondary: {
      main: mode === 'light' ? '#f06292' : '#ff80ab',
      light: mode === 'light' ? '#f48fb1' : '#ffb2dd',
      dark: mode === 'light' ? '#c2185b' : '#f06292',
    },
    background: {
      default: mode === 'light' ? '#f8f9fb' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
    text: {
      primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
      secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    }
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", sans-serif',
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light' 
            ? '0 4px 20px rgba(0,0,0,0.05)' 
            : '0 4px 20px rgba(0,0,0,0.3)',
          backgroundImage: 'none', // Prevent gradient backgrounds in dark mode
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'light'
            ? 'linear-gradient(90deg, #3f78bf 0%, #5592e8 100%)'
            : 'linear-gradient(90deg, #2c5a96 0%, #1e3f6f 100%)',
          boxShadow: mode === 'light'
            ? '0 4px 20px rgba(0,0,0,0.1)'
            : '0 4px 20px rgba(0,0,0,0.4)',
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.9rem',
          minHeight: 48,
          [createTheme().breakpoints.up('md')]: {
            minWidth: 120,
          },
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: mode === 'light' ? '#f06292' : '#ff80ab',
        },
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: 4,
          }
        }
      }
    }
  }
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function ClearHistoryButton() {
  const { clearChatHistory } = React.useContext(AppContext);
  
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all chat history? This action cannot be undone.")) {
      clearChatHistory();
    }
  };

  return (
    <Tooltip title="Clear chat history">
      <Button 
        variant="outlined" 
        color="error" 
        startIcon={<DeleteIcon />} 
        onClick={handleClearHistory}
        size="small"
        sx={{ ml: 1 }}
      >
        Clear History
      </Button>
    </Tooltip>
  );
}

export default function Dashboard() {
  const [tabIndex, setTabIndex] = useState(0);
  const [mode, setMode] = useState(localStorage.getItem('theme') || 'light');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const theme = getTheme(mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    // Close mobile drawer when changing tabs on mobile
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  
  const toggleColorMode = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.3s, color 0.3s'
      }}>
        <AppBar position="static" elevation={4}>
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
                aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
              >
                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              AURA - Empathetic AI Companion
            </Typography>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton color="inherit" onClick={toggleColorMode} aria-label="Toggle theme">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexGrow: 1,
            height: 'calc(100vh - 64px)',
            overflow: 'hidden'
          }}
        >
          {/* Chat Panel - Render as Drawer on mobile, static on desktop */}
          {isMobile ? (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{ keepMounted: true }}
              sx={{
                '& .MuiDrawer-paper': { 
                  width: '85%', 
                  boxSizing: 'border-box',
                  borderRadius: 0
                },
              }}
            >
              <Box sx={{ height: '100%' }}>
                <Chat />
              </Box>
            </Drawer>
          ) : (
            <Paper 
              elevation={4}
              sx={{ 
                width: '35%',
                borderRadius: 0,
                overflow: 'hidden',
              }}
            >
              <Chat />
            </Paper>
          )}
          
          {/* Content Panel */}
          <Box 
            sx={{ 
              width: isMobile ? '100%' : '65%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Paper 
              elevation={1} 
              sx={{ 
                borderRadius: 0, 
                boxShadow: 'none',
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                variant="fullWidth"
                textColor="primary"
                aria-label="Dashboard tabs"
              >
                 <Tab 
                  icon={<CodeIcon />} 
                  label="Agent Log" 
                  iconPosition="start"
                  aria-label="Agent Log tab"
                />
                 
                <Tab 
                  icon={<MusicIcon />} 
                  label="Content" 
                  iconPosition="start"
                  aria-label="Content tab"
                />
                <Tab 
                  icon={<JournalIcon />} 
                  label="Journal" 
                  iconPosition="start"
                  aria-label="Journal tab"
                />
               

                <Tab 
                  icon={<MoodIcon />} 
                  label="Mood" 
                  iconPosition="start"
                  aria-label="Mood tab"
                />
              </Tabs>
            </Paper>
            
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto',
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(0,0,0,0.2)' 
                : 'rgba(0,0,0,0.01)' 
            }}>
              <TabPanel value={tabIndex} index={0}>
                <AgentLog />
              </TabPanel>
               <TabPanel value={tabIndex} index={1}>
                <ContentFeed />
              </TabPanel>
              <TabPanel value={tabIndex} index={2}>
                <Journal />
              </TabPanel>
              <TabPanel value={tabIndex} index={3}>
                <MoodTracker />
              </TabPanel>
            </Box>
          </Box>
        </Box>
        
        {/* Mobile chat button */}
        {isMobile && !mobileOpen && (
          <Tooltip title="Open chat">
            <Button 
              variant="contained" 
              color="secondary"
              onClick={handleDrawerToggle}
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                borderRadius: 28,
                minWidth: 0,
                width: 56,
                height: 56,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 1100
              }}
            >
              <MicIcon />
            </Button>
          </Tooltip>
        )}
      </Box>
    </ThemeProvider>
  );
}
