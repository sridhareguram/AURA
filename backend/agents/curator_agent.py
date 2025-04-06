import re
import asyncio
import logging
import os
import json
from typing import Dict, List, Any

# HUGGING FACE Transformers for BERT classification
from transformers import pipeline

# For query generation
from openai import AsyncOpenAI

# For news search
from tavily import TavilyClient

# Your config and custom API clients for YouTube and Spotify
from backend.config.config import Config
from backend.utils.api_clients import search_youtube_videos, search_spotify_tracks

logger = logging.getLogger(__name__)

class CuratorAgent:
    def __init__(self):
        """Initialize the CuratorAgent with a BERT-based classification pipeline."""
        logger.info("Initializing CuratorAgent")
        self._initialize_clients()
        self._configure_apis()

        # Set Hugging Face token for authentication
                # Initialize the classifier with the token
        self.classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            token=os.environ["HUGGINGFACE_TOKEN"]
        )

        self.context_cache = {}
        logger.info("CuratorAgent initialized successfully")

    def _initialize_clients(self):
        """Initialize API clients with proper error handling."""
        try:
            # OpenAI for search-query generation
            self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
            # Tavily for news search
            self.tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        except Exception as e:
            logger.error(f"Client initialization failed: {str(e)}")
            raise RuntimeError("API client initialization failed")

    def _configure_apis(self):
        """
        Configure API parameters.
        """
        self.youtube_params = {
            "max_results": 5,
            "video_duration": "medium"
        }
        
        self.tavily_params = {
            "max_results": 7,
            "search_depth": "advanced",
            "include_answer": False,
            "include_images": False
        }

    async def _classify_query(self, user_input: str) -> str:
        """
        Classify the query as 'emotional' or 'factual'.
        """
        logger.debug(f"Classifying query: {user_input[:50]}...")
        if not user_input or len(user_input) < 3:
            return "factual"
        try:
            candidate_labels = ["emotional", "factual"]
            result = self.classifier(user_input, candidate_labels, multi_label=False)
            top_label = result["labels"][0].lower()
            if top_label in candidate_labels:
                return top_label
            else:
                raise ValueError("Unexpected label.")
        except Exception as e:
            logger.error(f"Classification failed: {str(e)}, using fallback")
            emotional_words = {"feel", "sad", "happy", "angry", "upset", "love", "lonely", "depressed"}
            if any(word in user_input.lower() for word in emotional_words):
                return "emotional"
            return "factual"

    async def _extract_keyphrases(self, text: str) -> List[str]:
        """
        Extract up to 3 unique words from the text.
        """
        if not text or not text.strip():
            return ["general information"]
        words = re.findall(r'\w+', text.lower())
        unique_words = []
        for w in words:
            if w not in unique_words:
                unique_words.append(w)
        return unique_words[:3] or ["general information"]

    async def get_youtube_content(self, query: str, original_query: str) -> Dict[str, Any]:
        """
        Get YouTube content.
        """
        try:
            clean_query = re.sub(r'[^\w\s]', '', query[:100]).strip() or original_query[:100]
            results = await search_youtube_videos(query=clean_query, **self.youtube_params)
            if not results:
                logger.warning(f"No YouTube results found with query: {clean_query}")
                results = await search_youtube_videos(query=original_query[:100], **self.youtube_params)
            if not results:
                logger.warning("No YouTube results found with either query")
                return self._empty_content(original_query)
            return self._format_video_result(results[0])
        except Exception as e:
            logger.error(f"YouTube search failed: {str(e)}")
            return self._empty_content(original_query)

    async def get_spotify_music(self, query: str, original_query: str) -> Dict[str, Any]:
        """
        Get Spotify music content by searching for tracks.
        """
        try:
            results = await search_spotify_tracks(query=query, limit=1)
            if not results:
                logger.warning(f"No Spotify music results found with query: {query}")
                results = await search_spotify_tracks(query=original_query, limit=1)
            if not results:
                logger.warning("No Spotify music results found with either query")
                return self._empty_music(original_query)
            return self._format_music_result(results[0])
        except Exception as e:
            logger.error(f"Spotify music search failed: {str(e)}")
            return self._empty_music(original_query)

    async def generate_search_queries(self, user_input: str, mood: str) -> Dict[str, List[str]]:
        """
        Generate search queries using GPT.
        """
        try:
            query_type = await self._classify_query(user_input)
            keyphrases = await self._extract_keyphrases(f"{user_input} {mood}")
            prompt = f"""Generate search queries based on:
            - User input: {user_input}
            - Mood: {mood}
            - Type: {query_type}
            - Keyphrases: {keyphrases}

            Return exactly 3 video search queries and 3 news search queries in JSON format:
            {{
                "video": ["query1", "query2", "query3"],
                "news": ["query1", "query2", "query3"]
            }}
            """
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            try:
                result = json.loads(response.choices[0].message.content)
                if not isinstance(result, dict) or "video" not in result or "news" not in result:
                    raise ValueError("Invalid JSON structure")
                result["video"] = result.get("video", [])[:3] or [user_input]
                result["news"] = result.get("news", [])[:3] or [user_input]
                return result
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON response")
        except Exception as e:
            logger.error(f"Query generation failed: {str(e)}")
            return {"video": [user_input], "news": [user_input]}

    async def get_news_articles(self, query: str, original_query: str, is_emotional: bool = False) -> List[Dict[str, str]]:
        """
        Get news articles from Tavily.
        """
        try:
            source_filter = "site:goodnewsnetwork.org OR site:positive.news" if is_emotional else ""
            search_query = f"{query} {source_filter}".strip()
            response = self.tavily.search(query=search_query, **self.tavily_params)
            articles = []
            seen_urls = set()
            for result in response.get("results", [])[:5]:
                url = result.get("url", "")
                if url and url not in seen_urls:
                    articles.append({
                        "title": self._clean_text(result.get("title", ""), 100),
                        "url": url,
                        "source": "Trusted Source",
                        "snippet": self._clean_text(result.get("content", ""), 150)
                    })
                    seen_urls.add(url)
                    if len(articles) >= 3:
                        break
            if not articles:
                fallback_response = self.tavily.search(query=original_query, **self.tavily_params)
                for result in fallback_response.get("results", [])[:3]:
                    url = result.get("url", "")
                    if url and url not in seen_urls:
                        articles.append({
                            "title": self._clean_text(result.get("title", ""), 100),
                            "url": url,
                            "source": "Trusted Source",
                            "snippet": self._clean_text(result.get("content", ""), 150)
                        })
                        seen_urls.add(url)
            return articles or [self._empty_article(original_query)]
        except Exception as e:
            logger.error(f"News search failed: {str(e)}")
            return [self._empty_article(original_query)]

    def _format_video_result(self, video: Dict) -> Dict[str, Any]:
        """Format a YouTube video result."""
        try:
            return {
                "title": self._clean_text(video["snippet"]["title"], 100),
                "url": f"https://youtu.be/{video['id']['videoId']}",
                "description": self._clean_text(video["snippet"]["description"], 200),
                "thumbnail": video["snippet"]["thumbnails"]["high"]["url"],
                "artist": self._clean_text(video["snippet"]["channelTitle"], 50)
            }
        except (KeyError, TypeError) as e:
            logger.error(f"Error formatting video result: {str(e)}")
            return self._empty_content("video content")

    def _format_music_result(self, track: Dict) -> Dict[str, Any]:
        """Format a Spotify track result."""
        try:
            title = self._clean_text(track.get("name", ""), 100)
            artist = ""
            if "artists" in track and isinstance(track["artists"], list) and track["artists"]:
                artist = track["artists"][0].get("name", "")
            thumbnail = ""
            if "album" in track and track["album"].get("images"):
                thumbnail = track["album"]["images"][0].get("url", "")
            url = track.get("external_urls", {}).get("spotify", "")
            description = "Listen on Spotify"
            uri = track.get("uri", "")
            return {
                "title": title,
                "url": url,
                "description": description,
                "thumbnail": thumbnail,
                "artist": artist,
                "uri": uri
            }
        except Exception as e:
            logger.error(f"Error formatting Spotify music result: {str(e)}")
            return self._empty_music("music content")

    def _clean_text(self, text: str, max_length: int = 100) -> str:
        """Clean and truncate text."""
        if not text:
            return ""
        return re.sub(r'\s+', ' ', str(text)).strip()[:max_length]

    def _empty_content(self, context: str) -> Dict[str, Any]:
        """Placeholder for missing video content."""
        return {
            "title": f"Exploring {context}...",
            "url": "",
            "description": "Content coming soon",
            "thumbnail": "",
            "artist": ""
        }

    def _empty_music(self, context: str) -> Dict[str, Any]:
        """Placeholder for missing Spotify music content."""
        return {
            "title": f"Exploring {context}...",
            "url": "",
            "description": "Content coming soon",
            "thumbnail": "",
            "artist": ""
        }

    def _empty_article(self, context: str) -> Dict[str, str]:
        """Placeholder for missing news articles."""
        return {
            "title": f"Latest on {context}",
            "url": "",
            "source": "Trusted Source",
            "snippet": "Comprehensive analysis in progress"
        }

    async def get_curated_content(self, user_input: str, mood: str) -> Dict[str, Any]:
        """
        Orchestrate content retrieval:
          1) Generate search queries
          2) Classify query (emotional/factual)
          3) Fetch YouTube video content
          4) Fetch Spotify music content
          5) Fetch news articles
          6) Extract basic keyphrases
        """
        logger.info(f"Getting curated content for: {user_input}, mood: {mood}")
        try:
            queries = await self.generate_search_queries(user_input, mood)
            query_type = await self._classify_query(user_input)
            is_emotional = (query_type == "emotional")
            
            video_query = queries["video"][0] if queries["video"] else user_input
            video_content = await self.get_youtube_content(video_query, user_input)
            
            music_content = await self.get_spotify_music(video_query, user_input)
            
            news_query = queries["news"][0] if queries["news"] else user_input
            news_articles = await self.get_news_articles(news_query, user_input, is_emotional)
            
            context_keyphrases = await self._extract_keyphrases(user_input)
            
            logger.info("Content curation complete")
            return {
                "video": video_content,
                "music": music_content,
                "news": news_articles,
                "context_keyphrases": context_keyphrases
            }
        except Exception as e:
            logger.error(f"Content curation failed: {str(e)}")
            return {
                "video": self._empty_content(user_input),
                "music": self._empty_music(user_input),
                "news": [self._empty_article(user_input)],
                "context_keyphrases": [user_input.lower().strip() or "general information"]
            }
