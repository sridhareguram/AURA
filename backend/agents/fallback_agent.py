import logging
from typing import Dict, Any, List, Union

logger = logging.getLogger(__name__)

class FallbackAgent:
    """Provides graceful degradation when primary agents fail"""
    
    def get_final_recommendation(self, 
                                mood: str, 
                                support_message: str, 
                                journal_entry: str, 
                                curated_content: Union[Dict[str, Any], List[Dict[str, Any]], None]
                                ) -> Dict[str, Any]:
        """
        Ensure we always have a valid response to send back to the user
        even if some components fail.
        
        Args:
            mood: User's detected emotional state
            support_message: Message from the support agent
            journal_entry: Poetic journal entry
            curated_content: Content recommendation structure
            
        Returns:
            Dict containing a complete response
        """
        # Default message if support agent failed
        if not support_message or not isinstance(support_message, str):
            support_message = self._get_fallback_message(mood)
        
        # Default journal if journal agent failed
        if not journal_entry or not isinstance(journal_entry, str):
            journal_entry = self._get_fallback_journal()
            
        # Ensure content structure is valid
        processed_content = self._process_content(curated_content)
            
        final = {
            'message': support_message,
            'journal': journal_entry,
            'content': processed_content
        }
        
        logger.info(f"Final recommendation: {final}")
        return final
    
    def _process_content(self, content: Any) -> Dict[str, Any]:
        """Ensure content has the expected structure"""
        if not content:
            return self._get_fallback_content()
            
        if isinstance(content, dict):
            # Verify required keys exist
            required_keys = ['video', 'music', 'news']
            for key in required_keys:
                if key not in content or not content[key]:
                    content[key] = self._get_fallback_item(key)
            
            # Ensure news is a list
            if not isinstance(content.get('news', []), list):
                content['news'] = [self._get_fallback_item('news')]
                
            # Ensure context keyphrases exist
            if 'context_keyphrases' not in content or not content['context_keyphrases']:
                content['context_keyphrases'] = ['reflection', 'support', 'wellness']
                
            return content
        elif isinstance(content, list):
            # If content is a list, convert to expected dict structure
            return {
                'video': content[0] if content else self._get_fallback_item('video'),
                'music': content[1] if len(content) > 1 else self._get_fallback_item('music'),
                'news': content[2:] if len(content) > 2 else [self._get_fallback_item('news')],
                'context_keyphrases': ['fallback', 'support', 'wellness']
            }
        else:
            return self._get_fallback_content()
    
    def _get_fallback_message(self, mood: str) -> str:
        """Generate a fallback message based on mood"""
        mood_messages = {
            "happy": "It's wonderful to see you in good spirits! How can I enhance this positive energy today?",
            "sad": "I sense some sadness. Remember that all emotions are valid, and I'm here to support you.",
            "anxious": "I notice you might be feeling anxious. Let's take a breath together and find some calm.",
            "confused": "When things seem unclear, sometimes a gentle pause helps us find clarity. I'm here to help.",
            "angry": "I understand you might be feeling frustrated. Your feelings are valid, and I'm here to listen.",
            "neutral": "How are you feeling today? I'm here to support you however you need."
        }
        return mood_messages.get(mood.lower(), "I'm here to support you today. How can I help?")
    
    def _get_fallback_journal(self) -> str:
        """Provide a poetic journal entry when generation fails"""
        return """
        20:12 ✨
        
        Words between us float like leaves —
        Carried by winds of understanding...
        What patterns might they form when they land?
        Some questions need no answers, only contemplation.
        """
    
    def _get_fallback_item(self, item_type: str) -> Dict[str, str]:
        """Generate fallback items for different content types"""
        fallbacks = {
            "video": {
                "title": "Guided Meditation for Inner Peace",
                "url": "https://youtu.be/inpok4MKVLM",
                "description": "A calming meditation to center yourself",
                "thumbnail": "https://i.ytimg.com/vi/inpok4MKVLM/hqdefault.jpg",
                "artist": "Goodful"
            },
            "music": {
                "title": "Ambient Relaxation",
                "url": "https://open.spotify.com/track/0pYacDCZuRhcrwGUA5nTBe",
                "description": "Calming instrumental music",
                "thumbnail": "https://i.scdn.co/image/ab67616d0000b273d8601e15fa1b4351fe1fc6ae",
                "artist": "Ambient Sounds",
                "uri": "spotify:track:0pYacDCZuRhcrwGUA5nTBe"
            },
            "news": {
                "title": "Finding Joy in Small Moments",
                "url": "https://www.goodnewsnetwork.org/",
                "source": "Good News Network",
                "snippet": "Discover how mindful attention to everyday experiences can transform your outlook."
            }
        }
        return fallbacks.get(item_type, {"title": "Content coming soon", "description": "Please check back later"})
    
    def _get_fallback_content(self) -> Dict[str, Any]:
        """Generate complete fallback content structure"""
        return {
            "video": self._get_fallback_item("video"),
            "music": self._get_fallback_item("music"),
            "news": [self._get_fallback_item("news")],
            "context_keyphrases": ["support", "wellness", "mindfulness"]
        }
