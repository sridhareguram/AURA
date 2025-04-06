import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  useTheme, 
  Button, 
  Chip, 
  TextField,
  Stack, 
  IconButton,
  Tooltip,
  Fade,
  Divider,
  useMediaQuery
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  SentimentSatisfiedAlt as HappyIcon,
  SentimentVeryDissatisfied as SadIcon,
  SentimentDissatisfied as AnxiousIcon,
  SentimentNeutral as NeutralIcon,
  SentimentVeryDissatisfied as MoodyIcon,
  FilterList as FilterIcon,
  ClearAll as ClearAllIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  ChartTooltip, 
  Legend,
  Filler
);

export default function MoodTracker() {
  const { moodHistory } = useContext(AppContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for filters
  const [showFilters, setShowFilters] = useState(false);
  const [filteredMoods, setFilteredMoods] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date()
  });
  const [viewMode, setViewMode] = useState('chart');
  
  // Mood mapping
  const moodToValue = (mood) => {
    const lowerMood = String(mood).toLowerCase();
    if (lowerMood.includes('happy')) return 1;
    if (lowerMood.includes('neutral')) return 0.3;
    if (lowerMood.includes('moody')) return -0.3;
    if (lowerMood.includes('anxious')) return -0.7;
    if (lowerMood.includes('sad')) return -1;
    return 0;
  };

  const moodOptions = [
    { value: 'happy', label: 'Happy', color: '#4caf50', icon: <HappyIcon /> },
    { value: 'neutral', label: 'Neutral', color: '#2196f3', icon: <NeutralIcon /> },
    { value: 'moody', label: 'Moody', color: '#9c27b0', icon: <MoodyIcon /> },
    { value: 'anxious', label: 'Anxious', color: '#ff9800', icon: <AnxiousIcon /> },
    { value: 'sad', label: 'Sad', color: '#f44336', icon: <SadIcon /> }
  ];

  // Check if a date is within the specified range
  const isWithinDateRange = (date, start, end) => {
    const checkDate = new Date(date);
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Set hours to beginning and end of day for proper comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return checkDate >= startDate && checkDate <= endDate;
  };

  // Apply filters to mood history data
  useEffect(() => {
    const applyFilters = () => {
      let result = [...moodHistory];
      
      // Filter by date range
      if (dateRange.startDate && dateRange.endDate) {
        result = result.filter(entry => 
          isWithinDateRange(entry.timestamp, dateRange.startDate, dateRange.endDate)
        );
      }
      
      // Filter by selected moods
      if (selectedMoods.length > 0) {
        result = result.filter(entry => 
          selectedMoods.some(mood => 
            String(entry.mood).toLowerCase().includes(mood.toLowerCase())
          )
        );
      }
      
      setFilteredMoods(result);
    };
    
    applyFilters();
  }, [moodHistory, selectedMoods, dateRange]);

  const getMoodIcon = (mood) => {
    const lowerMood = String(mood).toLowerCase();
    if (lowerMood.includes('happy')) {
      return <HappyIcon fontSize="large" sx={{ color: '#4caf50' }} />;
    } else if (lowerMood.includes('anxious')) {
      return <AnxiousIcon fontSize="large" sx={{ color: '#ff9800' }} />;
    } else if (lowerMood.includes('sad')) {
      return <SadIcon fontSize="large" sx={{ color: '#f44336' }} />;
    } else if (lowerMood.includes('moody')) {
      return <MoodyIcon fontSize="large" sx={{ color: '#9c27b0' }} />;
    } else {
      return <NeutralIcon fontSize="large" sx={{ color: '#2196f3' }} />;
    }
  };

  const getMoodColor = (mood) => {
    const lowerMood = String(mood).toLowerCase();
    if (lowerMood.includes('happy')) return '#4caf50';
    if (lowerMood.includes('sad')) return '#f44336';
    if (lowerMood.includes('anxious')) return '#ff9800';
    if (lowerMood.includes('moody')) return '#9c27b0';
    return '#2196f3';
  };

  // Format timestamps consistently
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedMoods([]);
    setDateRange({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    });
  };

  // Toggle mood selection
  const handleMoodToggle = (mood) => {
    setSelectedMoods(prev => 
      prev.includes(mood) 
        ? prev.filter(m => m !== mood) 
        : [...prev, mood]
    );
  };

  // Date change handlers
  const handleStartDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDateRange(prev => ({ ...prev, startDate: newDate }));
    }
  };

  const handleEndDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDateRange(prev => ({ ...prev, endDate: newDate }));
    }
  };

  // Export data as CSV
  const handleExportData = () => {
    const csvContent = [
      ['Timestamp', 'Mood', 'Value'],
      ...filteredMoods.map(entry => [
        new Date(entry.timestamp).toLocaleString(),
        entry.mood,
        moodToValue(entry.mood)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mood_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate mood statistics
  const calculateStats = () => {
    if (!filteredMoods.length) return null;
    
    const moodCounts = {};
    moodOptions.forEach(option => {
      moodCounts[option.value] = 0;
    });
    
    filteredMoods.forEach(entry => {
      const lowerMood = String(entry.mood).toLowerCase();
      moodOptions.forEach(option => {
        if (lowerMood.includes(option.value)) {
          moodCounts[option.value]++;
        }
      });
    });
    
    const mostFrequentMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const averageMoodValue = filteredMoods.reduce(
      (sum, entry) => sum + moodToValue(entry.mood), 0
    ) / filteredMoods.length;
    
    return { 
      mostFrequentMood, 
      averageMoodValue,
      moodCounts
    };
  };
  
  const stats = calculateStats();

  // Determine overall trend
  const determineTrend = () => {
    if (filteredMoods.length < 3) return 'Not enough data';
    
    const recentMoods = [...filteredMoods].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, Math.min(5, filteredMoods.length));
    
    const values = recentMoods.map(m => moodToValue(m.mood)).reverse();
    let improvingCount = 0;
    let worseningCount = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i-1]) improvingCount++;
      else if (values[i] < values[i-1]) worseningCount++;
    }
    
    if (improvingCount > worseningCount) return 'Improving';
    if (worseningCount > improvingCount) return 'Declining';
    return 'Stable';
  };
  
  const trend = determineTrend();

  // Chart data
  const chartData = {
    labels: filteredMoods.map(entry => formatTime(entry.timestamp)),
    datasets: [
      {
        label: 'Emotional State',
        data: filteredMoods.map(entry => moodToValue(entry.mood)),
        fill: true,
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(75, 192, 192, 0.1)'
          : 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        pointBackgroundColor: filteredMoods.map(entry => getMoodColor(entry.mood)),
        pointRadius: 6,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: -1,
        max: 1,
        ticks: {
          color: theme.palette.text.secondary,
          callback: function(value) {
            if (value === 1) return 'Happy';
            if (value === 0) return 'Neutral';
            if (value === -1) return 'Sad';
            return '';
          }
        },
        grid: {
          color: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        ticks: {
          color: theme.palette.text.secondary,
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          display: false,
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(0, 0, 0, 0.8)'
          : 'rgba(255, 255, 255, 0.8)',
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const mood = filteredMoods[index].mood;
            return `Mood: ${String(mood).charAt(0).toUpperCase() + String(mood).slice(1)}`;
          }
        }
      }
    },
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Mood Tracker
        </Typography>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Toggle filters">
            <IconButton 
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? "primary" : "default"}
            >
              <FilterIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export data">
            <IconButton onClick={handleExportData}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Switch view">
            <IconButton 
              onClick={() => setViewMode(viewMode === 'chart' ? 'stats' : 'chart')}
              color={viewMode === 'stats' ? "primary" : "default"}
            >
              {viewMode === 'chart' ? <BarChartIcon /> : <TrendingUpIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      
      {/* Filters section */}
      <Fade in={showFilters}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: '12px',
            display: showFilters ? 'block' : 'none',
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Filters
              </Typography>
              <Button 
                startIcon={<ClearAllIcon />} 
                size="small" 
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </Box>
            
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={2} 
              sx={{ width: '100%' }}
              alignItems={isMobile ? "flex-start" : "center"}
            >
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {moodOptions.map((mood) => (
                  <Chip
                    key={mood.value}
                    icon={mood.icon}
                    label={mood.label}
                    onClick={() => handleMoodToggle(mood.value)}
                    sx={{
                      backgroundColor: selectedMoods.includes(mood.value) ? 
                        `${mood.color}20` : undefined,
                      borderColor: selectedMoods.includes(mood.value) ? 
                        mood.color : undefined,
                      borderWidth: selectedMoods.includes(mood.value) ? 1 : 0,
                      borderStyle: 'solid',
                      '& .MuiChip-icon': {
                        color: selectedMoods.includes(mood.value) ? 
                          mood.color : undefined,
                      }
                    }}
                    variant={selectedMoods.includes(mood.value) ? 
                      "outlined" : "filled"}
                  />
                ))}
              </Stack>
              
              <Stack 
                direction={isMobile ? "column" : "row"} 
                spacing={2}
                sx={{ mt: isMobile ? 2 : 0 }}
              >
                <TextField
                  label="From"
                  type="date"
                  value={formatDateForInput(dateRange.startDate)}
                  onChange={handleStartDateChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="To"
                  type="date"
                  value={formatDateForInput(dateRange.endDate)}
                  onChange={handleEndDateChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Fade>

      {moodHistory && moodHistory.length > 0 ? (
        <>
          {viewMode === 'chart' ? (
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '60%',
                mb: 3,
                borderRadius: '16px',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(120deg, #1e1e1e 0%, #2d2d2d 100%)'
                  : 'linear-gradient(120deg, #ffffff 0%, #f7faff 100%)',
                boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: 
                    theme.palette.mode === 'dark'
                      ? 'radial-gradient(circle at top right, rgba(255,255,255,0.05) 0%, transparent 70%)'
                      : 'radial-gradient(circle at top right, rgba(25,118,210,0.05) 0%, transparent 70%)',
                  zIndex: 0
                }
              }}
            >
              {filteredMoods.length > 0 ? (
                <Box sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
                  <Line data={chartData} options={chartOptions} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    opacity: 0.7
                  }}
                >
                  <InfoIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6">No moods match your filters</Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Try adjusting your filters or adding more mood entries
                  </Typography>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '60%',
                mb: 3,
                borderRadius: '16px',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(120deg, #1e1e1e 0%, #2d2d2d 100%)'
                  : 'linear-gradient(120deg, #ffffff 0%, #f7faff 100%)',
                boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
                overflow: 'auto'
              }}
            >
              {stats ? (
                <Box sx={{ height: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 500 }}>
                    Mood Analysis
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary">
                        Most Frequent Mood
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {getMoodIcon(stats.mostFrequentMood)}
                        <Typography variant="h5" sx={{ ml: 1, textTransform: 'capitalize' }}>
                          {stats.mostFrequentMood}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary">
                        Current Trend
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <TrendingUpIcon 
                          sx={{ 
                            color: 
                              trend === 'Improving' ? '#4caf50' : 
                              trend === 'Declining' ? '#f44336' : '#2196f3',
                            fontSize: 32
                          }} 
                        />
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {trend}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider />
                    
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                        Mood Distribution
                      </Typography>
                      
                      <Stack spacing={1.5} sx={{ px: 1 }}>
                        {moodOptions.map(mood => (
                          <Box key={mood.value} sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {React.cloneElement(mood.icon, { 
                                  sx: { fontSize: 18, color: mood.color, mr: 1 } 
                                })}
                                <Typography variant="body2">
                                  {mood.label}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight="medium">
                                {stats.moodCounts[mood.value]} entries
                              </Typography>
                            </Box>
                            <Box 
                              sx={{ 
                                width: '100%', 
                                height: 8, 
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                borderRadius: 4,
                                overflow: 'hidden'
                              }}
                            >
                              <Box 
                                sx={{ 
                                  height: '100%', 
                                  width: `${(stats.moodCounts[mood.value] / filteredMoods.length) * 100}%`,
                                  bgcolor: mood.color,
                                  borderRadius: 4,
                                  transition: 'width 1s ease-in-out'
                                }} 
                              />
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    opacity: 0.7
                  }}
                >
                  <InfoIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6">No data to analyze</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Record more moods to see statistics
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: 2
            }}
          >
            {(filteredMoods.length > 0 ? filteredMoods : moodHistory)
              .slice(-3)
              .reverse()
              .map((entry, index) => (
                <Card
                  key={index}
                  elevation={3}
                  sx={{
                    borderRadius: '16px',
                    bgcolor: theme.palette.background.paper,
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    },
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: getMoodColor(entry.mood)
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', pt: 3 }}>
                    {getMoodIcon(entry.mood)}
                    <Typography 
                      sx={{ 
                        mt: 1.5, 
                        fontWeight: 600, 
                        textTransform: 'capitalize',
                        color: getMoodColor(entry.mood)
                      }}
                    >
                      {String(entry.mood).toLowerCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatTime(entry.timestamp)}
                    </Typography>
                  </CardContent>
                </Card>
            ))}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: 0.7
          }}
        >
          <NeutralIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.7 }} />
          <Typography variant="h6">No mood data yet</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Share how you're feeling to start tracking your emotional journey
          </Typography>
        </Box>
      )}
    </Box>
  );
}
