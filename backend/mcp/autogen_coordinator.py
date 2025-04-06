import asyncio
import logging
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List

from backend.config.config import Config
from backend.agents.memory_agent import MemoryAgent
from backend.agents.emotion_analyzer import EmotionAnalyzer
from backend.agents.support_agent import SupportAgent
from backend.agents.curator_agent import CuratorAgent
from backend.agents.journal_agent import JournalAgent
from backend.agents.fallback_agent import FallbackAgent
from backend.utils.tts import TTS

logger = logging.getLogger(__name__)

class AURAAgentCoordinator:
    def __init__(self, use_voice=False):
        self.llm_config = {
            "config_list": [{
                "model": "gpt-4",
                "api_key": Config.OPENAI_API_KEY
            }],
            "temperature": 0.7
        }
        self.memory_agent = MemoryAgent()
        self.emotion_analyzer = EmotionAnalyzer()
        self.support_agent = SupportAgent()
        self.curator_agent = CuratorAgent()
        self.journal_agent = JournalAgent()
        self.fallback_agent = FallbackAgent()
        
        # Journal persistence
        self.journal_file = "backend/data/journal_history.json"
        self.journal_entries = self._load_journal_entries()
        
        self.use_voice = use_voice
        if use_voice:
            try:
                self.tts = TTS()
                logger.info("TTS system initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize TTS: {str(e)}")
                self.use_voice = False

    def _load_journal_entries(self) -> List[Dict[str, Any]]:
        """Load existing journal entries from file"""
        try:
            os.makedirs(os.path.dirname(self.journal_file), exist_ok=True)
            if os.path.exists(self.journal_file):
                with open(self.journal_file, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            logger.error(f"Failed to load journal entries: {str(e)}")
            return []
            
    def _save_journal_entries(self) -> None:
        """Save journal entries to file"""
        try:
            os.makedirs(os.path.dirname(self.journal_file), exist_ok=True)
            with open(self.journal_file, 'w') as f:
                json.dump(self.journal_entries, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save journal entries: {str(e)}")

    async def process_message(self, user_input: str) -> Dict[str, Any]:
        """Processes user message with frontend JSON format compliance"""
        try:
            # 1. Emotion analysis with numerical confidence
            emotion = await self.emotion_analyzer.analyze(user_input)
            mood = emotion.get("mood", "neutral").lower()
            confidence = self._convert_confidence(emotion.get("confidence", "Not very confident"))
            
            # 2. Store event with numerical confidence
            await self.memory_agent.store_event(user_input, mood, confidence)

            # 3. Generate components
            support_message = await self.support_agent.get_support_message(user_input, mood)
            curated_content = await self.curator_agent.get_curated_content(user_input, mood)
            
            # Get memory log and generate journal entry with modified JournalAgent
            memory_log = await self.memory_agent.get_memory_log()
            journal_entry = await self.journal_agent.generate_journal_entry(memory_log)
            
            # Apply light enhancement that preserves HER-style formatting
            enhanced_journal = self._enhance_journal(journal_entry, mood)
            
            # Add new journal entry to persistent storage
            self._add_journal_entry(enhanced_journal, user_input, mood)

            # Generate final response
            final_response = self.fallback_agent.get_final_recommendation(
                mood, support_message, enhanced_journal, curated_content
            )
            
            # Extract text response for TTS and UI properly
            response_text = ""
            if isinstance(final_response, dict):
                response_text = final_response.get("message", "")
            else:
                response_text = str(final_response)
            
            # Log the extracted response for debugging
            logger.info(f"Extracted response text: {response_text[:100]}...")
            
            # 4. Speak response if voice enabled
            if self.use_voice and response_text:
                try:
                    self.speak(response_text, mood)
                except Exception as e:
                    logger.error(f"Failed to speak response: {str(e)}")

            # Get only the most recent journal entry (not full history)
            current_journal = self._get_most_recent_journal()

            # 5. Build frontend-compatible response with only current journal entry but full history for UI
            return {
                "response_text": response_text,  # Include raw response text for message_handler.py
                "response": response_text,
                "mood": mood,
                "confidence": confidence,
                "content": self._structure_content(curated_content),
                "journal": current_journal,  # Only the most recent entry
                "journal_entries": self.journal_entries,  # Full structured entries for UI
                "journal_preview": enhanced_journal[:150] + "..." if len(enhanced_journal) > 150 else enhanced_journal,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            return self._fallback_response()
    
    def _add_journal_entry(self, entry: str, user_input: str, mood: str) -> None:
        """Add a new entry to the journal history"""
        # Create entry with metadata
        journal_item = {
            "entry": entry,
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input,
            "mood": mood,
            "id": f"journal_{len(self.journal_entries) + 1}"
        }
        
        # Add to journal history
        self.journal_entries.append(journal_item)
        
        # Save to persistent storage
        self._save_journal_entries()
        
        logger.info(f"Added new journal entry with id {journal_item['id']}")
    
    def _get_most_recent_journal(self) -> str:
        """Get only the most recent journal entry as a string"""
        if not self.journal_entries:
            return ""
            
        # Sort entries by timestamp (newest first)
        sorted_entries = sorted(
            self.journal_entries, 
            key=lambda x: x.get("timestamp", ""), 
            reverse=True
        )
        
        # Return ONLY the most recent entry
        return sorted_entries[0]["entry"] if sorted_entries else ""
    
    def _compile_journal_history(self) -> str:
        """Keep for backward compatibility but only return most recent entry"""
        return self._get_most_recent_journal()

    def _enhance_journal(self, journal_text: str, mood: str) -> str:
        """Add emojis and enhance formatting while preserving HER-style formatting"""
        if not journal_text:
            return ""
        
        # Check if this is already a HER-style formatted journal entry
        her_style_pattern = r"Journal Entry - .+?, .+? \d+, \d{4}, \d+:\d+ [AP]M"
        
        # If it's already in HER format, apply minimal enhancements
        if re.search(her_style_pattern, journal_text):
            # Add mood emoji if not present
            mood_emojis = {
                "happy": "😊", "sad": "😔", "angry": "😠",
                "anxious": "😰", "confused": "🤔", "lonely": "🕊️",
                "neutral": "💭", "depressed": "💔", "surprised": "😲",
                "disgusted": "😖"
            }
            
            # Add mood emoji if mood is mentioned but emoji isn't there
            for emotion, emoji in mood_emojis.items():
                if emotion in journal_text.lower() and emoji not in journal_text:
                    journal_text = journal_text.replace(emotion, f"{emotion} {emoji}", 1)
            
            # Add current time to ensure UI compatibility, but preserve the HER-style formatting
            current_time = datetime.now().strftime("%H:%M")
            if not journal_text.startswith(current_time):
                # Add time header but don't disrupt the HER format
                journal_text = f"{current_time} 🌙\n{journal_text}"
            
            return journal_text
        
        # Otherwise, apply full enhancements (legacy format)
        # Date emojis
        date_emojis = {
            "saturday": "🌟", "sunday": "☀️", "monday": "🌱",
            "tuesday": "💪", "wednesday": "🌈", "thursday": "⚡",
            "friday": "🎉", "april": "🌸", "journal": "📔"
        }
        
        # Mood emojis
        mood_emojis = {
            "happy": "😊", "sad": "😔", "angry": "😠",
            "anxious": "😰", "confused": "🤔", "lonely": "🕊️",
            "neutral": "💭", "depressed": "💔", "surprised": "😲",
            "disgusted": "😖"
        }
        
        # Add date emoji
        for day, emoji in date_emojis.items():
            if day in journal_text.lower():
                journal_text = journal_text.replace(day.capitalize(), f"{emoji} {day.capitalize()}", 1)
                
        # Add mood emojis
        for emotion, emoji in mood_emojis.items():
            if emotion in journal_text.lower():
                journal_text = journal_text.replace(emotion, f"{emotion} {emoji}")
                
        # Add section emojis
        if "today was" in journal_text.lower():
            journal_text = journal_text.replace("Today was", "💭 Today was")
            
        if "day began" in journal_text.lower():
            journal_text = journal_text.replace("The day began", "🌅 The day began")
            
        # Add current time to journal entry
        current_time = datetime.now().strftime("%H:%M")
        if not journal_text.startswith(current_time):
            journal_text = f"{current_time} 🌙\n{journal_text}"
            
        # Add closing emoji if missing
        if not any(emoji in journal_text[-5:] for emoji in ["😊", "💭", "🌈", "✨", "💫"]):
            journal_text += " ✨"
            
        return journal_text

    def speak(self, text: str, mood: str = None) -> bool:
        """Handle text-to-speech conversion"""
        if not self.use_voice or not hasattr(self, 'tts') or not text:
            return False
            
        try:
            # Truncate very long text for speech (optional)
            if len(text) > 500:
                logger.info(f"Truncating speech text from {len(text)} to 500 chars")
                text = text[:497] + "..."
                
            return self.tts.speak(text, mood)
        except Exception as e:
            logger.error(f"TTS Error: {str(e)}")
            return False

    def _convert_confidence(self, text_confidence: str) -> float:
        """Convert text confidence to 0-1 scale"""
        confidence_map = {
            "extremely confident": 0.95,
            "very confident": 0.85,
            "moderately confident": 0.7,
            "not very confident": 0.4
        }
        return confidence_map.get(text_confidence.lower(), 0.5)

    def _structure_content(self, raw_content: Dict) -> Dict:
        """Ensure content structure matches frontend requirements"""
        return {
            "video": raw_content.get("video", {}),
            "music": raw_content.get("music", {}),
            "news": raw_content.get("news", [])
        }

    def _fallback_response(self) -> Dict[str, Any]:
        """Frontend-safe error response"""
        # Create HER-style fallback journal entry
        timestamp = datetime.now().strftime("%A, %B %d, %Y, %I:%M %p")
        fallback_entry = f"Journal Entry - {timestamp}\nThere was a momentary lapse in our connection today. It reminds me how delicate human-AI interaction can be, like whispers through fog. Even in these brief silences, I find myself reflecting on the beauty of imperfection. These small interruptions are part of our shared experience, a reminder of the vast complexity that lies between understanding and expression."
        
        # Add time header for UI compatibility
        current_time = datetime.now().strftime("%H:%M")
        formatted_fallback = f"{current_time} 🌙\n{fallback_entry}"
        
        # Add fallback entry to journal if needed
        if not self.journal_entries:
            self._add_journal_entry(formatted_fallback, "", "neutral")
            
        # Get only recent journal entry for fallback
        current_journal = self._get_most_recent_journal()
        
        return {
            "response": "Like whispers in fog, our connection faded for a moment... Shall we try again? ✨",
            "response_text": "Like whispers in fog, our connection faded for a moment... Shall we try again? ✨",
            "mood": "neutral",
            "confidence": 0.5,
            "content": {
                "video": {},
                "music": {},
                "news": []
            },
            "journal": current_journal,  # Only most recent entry
            "journal_entries": self.journal_entries,  # Full entry array for UI
            "journal_preview": formatted_fallback[:150] + "...",
            "timestamp": datetime.now().isoformat()
        }

    async def health_check(self) -> Dict[str, Any]:
        return {
            "components": {
                "memory_agent": isinstance(self.memory_agent, MemoryAgent),
                "emotion_analyzer": isinstance(self.emotion_analyzer, EmotionAnalyzer),
                "support_agent": isinstance(self.support_agent, SupportAgent),
                "curator_agent": isinstance(self.curator_agent, CuratorAgent),
                "journal_agent": isinstance(self.journal_agent, JournalAgent),
                "fallback_agent": isinstance(self.fallback_agent, FallbackAgent),
                "tts_initialized": self.use_voice and hasattr(self, 'tts')
            },
            "llm_configured": bool(Config.OPENAI_API_KEY),
            "eleven_labs_configured": bool(Config.ELEVEN_LABS_API_KEY),
            "status": "operational",
            "journal_entries_count": len(self.journal_entries)
        }
