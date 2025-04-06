import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActions, 
  Button, 
  Typography, 
  Grid,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  PlayArrow as PlayIcon, 
  MusicNote as MusicIcon, 
  Article as ArticleIcon,
  YouTube as YouTubeIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

export default function ContentFeed() {
  // Context state and methods
  const { 
    curatedContent, 
    playTrack, 
    isSpotifyReady, 
    connectSpotify,
    spotifyError
  } = useContext(AppContext);
  
  // Local state for managing UI feedback
  const [playbackError, setPlaybackError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Content availability checks
  const hasVideo = curatedContent?.video?.url;
  const hasMusic = curatedContent?.music?.uri;
  const hasNews = curatedContent?.news?.length > 0;

  // Handle music playback/connection
  const handleMusicAction = async () => {
    if (!hasMusic) return;
    
    try {
      setIsConnecting(true);
      
      if (isSpotifyReady) {
        await playTrack(curatedContent.music.uri);
      } else {
        await connectSpotify();
      }
    } catch (error) {
      setPlaybackError(true);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Error Feedback System */}
      <Snackbar
        open={playbackError || !!spotifyError}
        autoHideDuration={6000}
        onClose={() => {
          setPlaybackError(false);
          // Context should handle clearing spotifyError
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          sx={{ width: '100%', alignItems: 'center' }}
        >
          {spotifyError || 'Failed to start playback. Please try again.'}
        </Alert>
      </Snackbar>

      {/* Main Content Header */}
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 500,
          color: 'text.primary',
          letterSpacing: '0.02em'
        }}
      >
        Curated Content
      </Typography>

      {(hasVideo || hasMusic || hasNews) ? (
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          {/* Video Content Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={cardStyles('#f44336')}>
              <CardMedia
                component="img"
                height="200"
                image={hasVideo ? curatedContent.video.thumbnail : "https://via.placeholder.com/640x360?text=Calming+Video"}
                alt={hasVideo ? curatedContent.video.title : "Calming Video"}
                sx={{ borderBottom: '3px solid #f44336' }}
              />
              <CardContent sx={{ pb: 0 }}>
                <Box sx={headerStyle}>
                  <YouTubeIcon sx={iconStyle('#f44336')} />
                  <Typography variant="subtitle1" fontWeight={500}>
                    Recommended Video
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.3 }}>
                  {hasVideo ? curatedContent.video.title : "Discover Calming Content"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {hasVideo ? 
                    curatedContent.video.description : 
                    "Personalized videos based on your emotional state"
                  }
                </Typography>
                {hasVideo && curatedContent.video.artist && (
                  <ArtistChip artist={curatedContent.video.artist} />
                )}
              </CardContent>
              <CardActions sx={cardActionsStyle}>
                <Button 
                  variant="contained" 
                  startIcon={<PlayIcon />}
                  disabled={!hasVideo}
                  href={hasVideo ? curatedContent.video.url : "#"}
                  target="_blank"
                  sx={buttonStyle('#f44336', '#d32f2f')}
                >
                  Watch Now
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Music Content Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={cardStyles('#9c27b0')}>
              <CardMedia
                component="img"
                height="200"
                image={hasMusic ? curatedContent.music.thumbnail : "https://via.placeholder.com/640x360?text=Calming+Music"}
                alt={hasMusic ? curatedContent.music.title : "Calming Music"}
                sx={{ borderBottom: '3px solid #9c27b0' }}
              />
              <CardContent sx={{ pb: 0 }}>
                <Box sx={headerStyle}>
                  <MusicIcon sx={iconStyle('#9c27b0')} />
                  <Typography variant="subtitle1" fontWeight={500}>
                    Recommended Music
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.3 }}>
                  {hasMusic ? curatedContent.music.title : "Calming Melodies"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {hasMusic ? 
                    curatedContent.music.description : 
                    "Personalized music based on your emotional state"
                  }
                </Typography>
                {hasMusic && curatedContent.music.artist && (
                  <ArtistChip artist={curatedContent.music.artist} />
                )}
              </CardContent>
              <CardActions sx={cardActionsStyle}> <Button variant="contained" startIcon={ isConnecting ? ( <CircularProgress size={20} sx={{ color: 'white' }} /> ) : ( <MusicIcon /> ) } disabled={!hasMusic || isConnecting} onClick={handleMusicAction} href={hasMusic ? curatedContent.music.url : "#"} target="_blank" sx={buttonStyle('#9c27b0', '#7b1fa2')} > {isSpotifyReady ? "Listen Now" : "Connect Spotify"} </Button> </CardActions>
            </Card>
          </Grid>

          {/* News Content Section */}
          <Grid item xs={12}>
            <NewsSection hasNews={hasNews} newsItems={curatedContent.news} />
          </Grid>
        </Grid>
      ) : (
        <EmptyContentState />
      )}
    </Box>
  );
}

// Reusable Components
const ArtistChip = ({ artist }) => (
  <Chip 
    avatar={<Avatar>{artist[0]}</Avatar>}
    label={artist}
    size="small"
    sx={{ 
      mb: 2,
      '& .MuiChip-avatar': { bgcolor: 'primary.light' }
    }}
  />
);

const NewsSection = ({ hasNews, newsItems }) => (
  <Paper elevation={2} sx={paperStyle}>
    <Box sx={headerStyle}>
      <ArticleIcon sx={iconStyle('#4caf50')} />
      <Typography variant="h6" fontWeight={500}>
        Uplifting News
      </Typography>
    </Box>
    {hasNews ? (
      <Grid container spacing={2}>
        {newsItems.map((article, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <NewsArticleCard article={article} />
          </Grid>
        ))}
      </Grid>
    ) : (
      <Typography color="text.secondary">
        Uplifting news stories will appear here.
      </Typography>
    )}
  </Paper>
);

const NewsArticleCard = ({ article }) => (
  <Card variant="outlined" sx={newsCardStyle}>
    <CardContent>
      <Typography variant="subtitle1" fontWeight={500} gutterBottom>
        {article.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {article.snippet || "Positive news to brighten your day"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Source: {article.source || "AURA News"}
      </Typography>
    </CardContent>
    <CardActions>
      <Button 
        size="small" 
        href={article.url} 
        target="_blank"
        disabled={!article.url}
        sx={{ color: 'primary.main' }}
      >
        Read More
      </Button>
    </CardActions>
  </Card>
);

const EmptyContentState = () => (
  <Box sx={emptyStateStyle}>
    <MusicIcon sx={emptyIconStyle} />
    <Typography variant="h6">Content is being curated for you</Typography>
    <Typography variant="body2" color="text.secondary">
      Personalized recommendations will appear here
    </Typography>
  </Box>
);

// Style Constants
const cardStyles = (color) => ({
  height: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 12px 20px -10px ${color}40`
  }
});

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  mb: 2
};

const iconStyle = (color) => ({
  color: color,
  mr: 1.5,
  fontSize: '32px'
});

const cardActionsStyle = {
  px: 2,
  pb: 2,
  pt: 1
};

const buttonStyle = (bgColor, hoverColor) => ({
  borderRadius: 8,
  bgcolor: bgColor,
  '&:hover': { bgcolor: hoverColor },
  '&.Mui-disabled': { bgcolor: 'grey.300' }
});

const paperStyle = {
  p: 3,
  borderRadius: '16px',
  background: 'linear-gradient(120deg, #ffffff 0%, #f5f9ff 100%)'
};

const newsCardStyle = {
  height: '100%',
  borderRadius: 3,
  transition: 'transform 0.2s',
  '&:hover': { transform: 'translateY(-4px)' }
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  opacity: 0.7
};

const emptyIconStyle = {
  fontSize: 60,
  color: 'primary.main',
  mb: 2,
  opacity: 0.7
};
