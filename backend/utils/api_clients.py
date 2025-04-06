import httpx
import asyncio
import logging
import base64
from typing import Dict, List, Any, Optional
from backend.config.config import Config
import os

logger = logging.getLogger(__name__)

class APIClient:
    def __init__(self):
        """Initialize API client with keys from config."""
        self.youtube_video_key = Config.YOUTUBE_VIDEO_API_KEY
        self.youtube_music_key = Config.YOUTUBE_MUSIC_API_KEY
        self.tavily_key = Config.TAVILY_API_KEY
        # Spotify credentials (use environment variables in production)
        self.spotify_client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.spotify_client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    async def search_youtube_videos(
        self,
        query: str,
        max_results: int = 5,
        video_category: Optional[str] = None,
        video_duration: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search YouTube videos using YouTube Data API v3.
        """
        api_key = self.youtube_music_key if video_category == "10" else self.youtube_video_key
        params = {
            "part": "snippet",
            "q": query,
            "key": api_key,
            "type": "video",
            "maxResults": max_results,
            "videoEmbeddable": "true"
        }
        if video_duration:
            params["videoDuration"] = video_duration

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                items = response.json().get("items", [])
                if items:
                    logger.debug(f"First YouTube result: {items[0]['snippet'].get('title')}")
                return items
        except httpx.HTTPStatusError as e:
            logger.error(f"YouTube API HTTP error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            logger.error(f"YouTube search error: {str(e)}")
        return []

    async def get_spotify_token(self) -> str:
        """
        Obtain an access token from Spotify using the Client Credentials Flow.
        """
        auth_str = f"{self.spotify_client_id}:{self.spotify_client_secret}"
        b64_auth_str = base64.b64encode(auth_str.encode()).decode()
        headers = {
            "Authorization": f"Basic {b64_auth_str}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://accounts.spotify.com/api/token",
                    data=data,
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                token = response.json().get("access_token", "")
                return token
        except Exception as e:
            logger.error(f"Error obtaining Spotify token: {str(e)}")
            return ""

    async def search_spotify_tracks(self, query: str, limit: int = 1) -> List[Dict[str, Any]]:
        """
        Search for Spotify tracks using the Spotify Web API.
        """
        token = await self.get_spotify_token()
        if not token:
            logger.error("No Spotify token available.")
            return []
        params = {
            "q": query,
            "type": "track",
            "limit": limit
        }
        headers = {
            "Authorization": f"Bearer {token}"
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.spotify.com/v1/search",
                    params=params,
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                tracks = response.json().get("tracks", {}).get("items", [])
                return tracks
        except httpx.HTTPStatusError as e:
            logger.error(f"Spotify API HTTP error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            logger.error(f"Spotify search error: {str(e)}")
        return []

    async def get_tavily_news(self, query: str) -> List[Dict[str, str]]:
        """
        Search Tavily for relevant news articles.
        """
        payload = {
            "api_key": self.tavily_key,
            "query": query,
            "include_answer": True,
            "max_results": 5,
            "include_images": True
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json=payload,
                    timeout=20.0
                )
                response.raise_for_status()
                return response.json().get("results", [])
        except httpx.HTTPStatusError as e:
            logger.error(f"Tavily API HTTP error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            logger.error(f"Tavily news error: {str(e)}")
        return []

# Singleton client instance
api_client = APIClient()

# Expose methods for easier import
search_youtube_videos = api_client.search_youtube_videos
search_spotify_tracks = api_client.search_spotify_tracks
get_tavily_news = api_client.get_tavily_news
