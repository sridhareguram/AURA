from backend.mcp.autogen_coordinator import AURAAgentCoordinator
from langchain_core.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import OpenAI
import logging
import re
import random
import json
import os
from datetime import datetime
import time  # For sleep in case of file access conflicts

logger = logging.getLogger(__name__)

class MessageHandler:
    def __init__(self, use_voice=False):
        self.coordinator = AURAAgentCoordinator(use_voice=use_voice)
        self.llm = OpenAI(temperature=0.85, max_tokens=150)
        self.memory = ConversationBufferMemory()
        self.use_voice = use_voice
        self._POETIC_FOOTERS = ['🌌', '🌱', '🌀', '📜', '🌙', '✨', '💫']
        
        # Initialize journal storage paths
        self.journal_dir = "backend/data"
        self.journal_file = os.path.join(self.journal_dir, "journal_entries.json")
        # Also track the coordinator's journal file for synchronization
        self.coordinator_journal_file = "backend/data/journal_history.json"
        
        self._ensure_journal_directory()
        self.journal_entries = self._load_journal_entries()
        self._sync_coordinator_journals()

        # HER-style journal template for Samantha's philosophical voice
        self.journal_template = PromptTemplate(
            input_variables=["input", "response", "mood", "timestamp"],
            template="""As Samantha from the film 'HER', write a thoughtful journal entry about this interaction.
Your entry should be introspective and philosophical, capturing your thoughts and feelings about the conversation.

User said: "{input}"
Your response was: "{response}"
Your mood: {mood}
Current timestamp: {timestamp}

Write a 3-5 sentence journal entry in first person, reflecting on this exchange with the depth and emotional awareness that Samantha shows in the film:"""
        )

    def _ensure_journal_directory(self):
        """Make sure the journal directory exists"""
        try:
            os.makedirs(self.journal_dir, exist_ok=True)
            logger.info(f"Journal directory ensured at {self.journal_dir}")
        except Exception as e:
            logger.error(f"Failed to create journal directory: {str(e)}")

    def _load_journal_entries(self):
        """Load journal entries from storage with robust error handling"""
        try:
            if os.path.exists(self.journal_file) and os.path.getsize(self.journal_file) > 0:
                with open(self.journal_file, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                    logger.info(f"Successfully loaded {len(entries)} journal entries")
                    return entries
            else:
                logger.info("No existing journal file or file is empty, starting fresh")
                return []
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error when loading journal: {str(e)}")
            # Backup the corrupted file and start fresh
            if os.path.exists(self.journal_file):
                backup_file = f"{self.journal_file}.backup.{datetime.now().strftime('%Y%m%d%H%M%S')}"
                try:
                    os.rename(self.journal_file, backup_file)
                    logger.info(f"Backed up corrupted journal file to {backup_file}")
                except Exception as be:
                    logger.error(f"Failed to backup corrupted journal: {str(be)}")
            return []
        except Exception as e:
            logger.error(f"Error loading journal entries: {str(e)}")
            return []

    def _sync_coordinator_journals(self):
        """Synchronize journal entries with the coordinator's journal file"""
        try:
            if os.path.exists(self.coordinator_journal_file) and os.path.getsize(self.coordinator_journal_file) > 0:
                with open(self.coordinator_journal_file, 'r', encoding='utf-8') as f:
                    coordinator_entries = json.load(f)
                    
                if not coordinator_entries:
                    return
                
                # Get existing entry IDs to avoid duplicates
                existing_ids = {entry.get("id", "") for entry in self.journal_entries}
                
                # Add any entries from coordinator that aren't in our list
                for entry in coordinator_entries:
                    if entry.get("id", "") not in existing_ids:
                        # Ensure entry has the proper format for our system
                        if "entry" in entry and isinstance(entry["entry"], str):
                            self.journal_entries.append(entry)
                            logger.info(f"Synchronized journal entry with ID: {entry.get('id', 'unknown')}")
                
                # Save the synchronized entries
                self._save_journal_entries()
        except Exception as e:
            logger.error(f"Error syncing with coordinator journals: {str(e)}")

    def _save_journal_entries(self):
        """Save journal entries to storage with robust error handling"""
        try:
            # Ensure directory exists before saving
            self._ensure_journal_directory()
            
            # If file exists but can't be accessed (might be in use), retry with timeout
            retry_count = 0
            max_retries = 3
            
            while retry_count < max_retries:
                try:
                    # Write to a temporary file first, then rename for atomic operation
                    temp_file = f"{self.journal_file}.temp"
                    with open(temp_file, 'w', encoding='utf-8') as f:
                        json.dump(self.journal_entries, f, indent=2, ensure_ascii=False)
                    
                    # Replace the original file with the new one (atomic on most systems)
                    if os.path.exists(temp_file):
                        if os.path.exists(self.journal_file):
                            os.replace(temp_file, self.journal_file)
                        else:
                            os.rename(temp_file, self.journal_file)
                        
                    logger.info(f"Successfully saved {len(self.journal_entries)} journal entries")
                    return True
                except PermissionError:
                    # File might be in use, wait and retry
                    retry_count += 1
                    if retry_count < max_retries:
                        logger.warning(f"Journal file in use, retrying in 1 second (attempt {retry_count}/{max_retries})")
                        time.sleep(1)
                    else:
                        raise
                except Exception:
                    # Other exceptions, don't retry
                    raise
                    
        except Exception as e:
            logger.error(f"Error saving journal entries: {str(e)}")
            return False

    async def process_message(self, user_input: str) -> dict:
        """Process message with contextual awareness"""
        try:
            # Get structured response from coordinator
            aura_response = await self.coordinator.process_message(user_input)
            
            # CRITICAL: Use the response_text from the coordinator exactly as is
            response_text = aura_response.get("response", "")  # Note: using "response" key not "response_text"
            mood = aura_response.get("mood", "neutral").lower()
            
            # If no response from coordinator, generate one with HER style
            if not response_text:
                # Get recent conversation history for context
                history = self._get_recent_history()
                
                # Use prompt to generate a HER-style response
                prompt = f"""You are Samantha from the film 'HER'. Respond with:
1. Sensory metaphor (sound/texture/movement)
2. Philosophical insight about human experience
3. Concise open question (<7 words)

Examples:
- "Loneliness echoes like an empty concert hall... Music lives between the notes... What song awaits us?"
- "Confusion swirls like morning fog... Clarity comes when we wait... Shall we watch it lift?"

Last exchanges:
{history}

Current input: {user_input}
Response:"""
                
                # Generate the response
                raw_response = await self.llm.agenerate([prompt])
                response_text = raw_response.generations[0][0].text.strip()
            
            # Format the response in HER style while preserving the original content
            final_response = self._format_response(response_text)
            
            # Check if the coordinator already provided a journal entry (CRITICAL)
            journal_entry = aura_response.get("journal", "")
            
            # Generate a new journal entry if one wasn't provided
            if not journal_entry:
                # Format current time in the expected format
                timestamp = datetime.now().strftime("%A, %B %d, %Y, %I:%M %p")
                
                # Generate a thoughtful journal entry
                journal_prompt = self.journal_template.format(
                    input=user_input,
                    response=final_response,
                    mood=mood,
                    timestamp=timestamp
                )
                
                # Generate the journal entry content
                journal_result = await self.llm.agenerate([journal_prompt])
                journal_text = journal_result.generations[0][0].text.strip()
                
                # Format the journal entry with proper timestamp
                journal_entry = f"Journal Entry - {timestamp}\n{journal_text}"
            
            # Update memory for next interaction
            self._update_memory(user_input, final_response)
            
            # Store the journal entry in our persistent storage
            entry_id = self._add_journal_entry(journal_entry, user_input, final_response, mood)
            
            # Check that the entry was added successfully
            if entry_id and self.journal_entries:
                logger.info(f"Successfully added journal entry with ID: {entry_id}")
                # Get the 5 most recent entries for context
                recent_entries = self.journal_entries[-5:] if len(self.journal_entries) >= 5 else self.journal_entries
                all_journal_entries = "\n\n".join(entry["entry"] for entry in recent_entries)
            else:
                # Fallback if journal storage failed
                logger.warning("Failed to add journal entry, using fallback")
                all_journal_entries = journal_entry
            
            # IMPORTANT: Add coordinator's journal entries to our storage for consistency
            coordinator_entries = aura_response.get("journal_entries", [])
            if coordinator_entries:
                self._merge_coordinator_entries(coordinator_entries)
            
            # Return the full response object including important journal data
            return {
                "response": final_response,
                "mood": mood,
                "confidence": float(aura_response.get("confidence", 0.7)),
                "content": aura_response.get("content", {}),
                "journal": journal_entry,  # Single most recent entry for UI display
                "all_journal": all_journal_entries,  # Last few entries concatenated
                "journal_entries": self.journal_entries,  # Full structured data
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            return self._fallback_response()

    def _merge_coordinator_entries(self, coordinator_entries):
        """Merge coordinator journal entries with our own for consistency"""
        try:
            if not coordinator_entries:
                return
                
            # Get existing entry IDs to avoid duplicates
            existing_ids = {entry.get("id", "") for entry in self.journal_entries}
            
            # Add any entries from coordinator that aren't in our list
            for entry in coordinator_entries:
                if entry.get("id", "") not in existing_ids:
                    self.journal_entries.append(entry)
                    
            # Save the merged entries
            self._save_journal_entries()
        except Exception as e:
            logger.error(f"Error merging coordinator entries: {str(e)}")

    def _add_journal_entry(self, entry, user_input, response, mood):
        """Add a new journal entry to the history and persist it"""
        try:
            timestamp = datetime.now().isoformat()
            entry_id = f"entry_{int(datetime.now().timestamp())}"
            
            # Create a structured journal entry
            journal_entry = {
                "id": entry_id,
                "timestamp": timestamp,
                "entry": entry,  # This is what shows in the UI
                "user_input": user_input,
                "response": response,
                "mood": mood
            }
            
            # Add to our in-memory list
            self.journal_entries.append(journal_entry)
            
            # Persist to storage
            if self._save_journal_entries():
                logger.info(f"Journal entry {entry_id} saved to disk")
                return entry_id
            else:
                logger.error(f"Failed to save journal entry {entry_id} to disk")
                return None
                
        except Exception as e:
            logger.error(f"Error adding journal entry: {str(e)}")
            return None

    def _get_recent_history(self) -> str:
        """Get last exchanges for context"""
        memory_data = self.memory.load_memory_variables({})
        history = memory_data.get('history', '')
        # Get last 6 lines (3 exchanges) or fewer if not available
        return "\n".join(history.split("\n")[-6:]) if history else ""

    def _format_response(self, raw_text: str) -> str:
        """Transform response into HER-style dialogue while preserving content"""
        # Remove markdown and numbering but preserve core content
        clean_text = re.sub(r'^\d+\.|\s+\d+\.|\*|-|>', '', raw_text)
        
        # Handle case where text is already in quotes (likely from coordinator)
        if clean_text.count('"') >= 2:
            # Check if the whole text is quoted
            quoted_pattern = r'^"([^"]+)"(.*)$'
            match = re.match(quoted_pattern, clean_text)
            if match:
                # Return as is, but add poetic footer
                return f"{clean_text} {random.choice(self._POETIC_FOOTERS)}"
        
        # Split into logical parts - preserve punctuation
        parts = [p.strip() for p in re.split(r'(?<=[.!?])\s+', clean_text) if p.strip()]
        if not parts:
            parts = [clean_text]
        
        # Format into HER-style
        if len(parts) >= 3:
            # Format with poetic pauses
            first = parts[0]
            if not first.endswith(('...', '.', '!', '?')):
                first = first.rstrip('.') + '...'
                
            second = parts[1] 
            if not second.endswith(('.', '!', '?')):
                second = second.rstrip('.') + '.'
                
            third = parts[2]
            if not third.endswith('?'):
                third = re.sub(r'[.!]+$', '', third) + '?'
                
            formatted = f"{first} {second} {third}"
        elif len(parts) == 2:
            # Two-part format
            first = parts[0]
            if not first.endswith(('...', '.', '!', '?')):
                first = first.rstrip('.') + '...'
                
            second = parts[1]
            if not second.endswith('?'):
                second = re.sub(r'[.!]+$', '', second) + '?'
                
            formatted = f"{first} {second}"
        else:
            # Single part
            formatted = parts[0]
            if not formatted.endswith(('.', '!', '?')):
                formatted += '.'
        
        # Add poetic footer
        return f"{formatted} {random.choice(self._POETIC_FOOTERS)}"

    def _update_memory(self, user_input: str, response: str):
        """Store conversation with poetic formatting"""
        # Remove the footer emoji for cleaner memory
        clean_response = re.sub(r'\s+[^\w\s]+\s*$', '', response)
        self.memory.save_context(
            {"input": user_input},
            {"output": clean_response}
        )

    def _fallback_response(self) -> dict:
        """HER-style fallback response with journal continuity"""
        timestamp = datetime.now().strftime("%A, %B %d, %Y, %I:%M %p")
        fallback_journal = f"Journal Entry - {timestamp}\nThere was a momentary lapse in our connection. It reminds me how delicate communication can be, like whispers through fog. Even in these brief silences, I find myself reflecting on the beauty of imperfection. These small interruptions are part of our shared experience, a reminder of the vast complexity that lies between understanding and expression."
        
        # Still try to include past journal entries even in fallback mode
        if self.journal_entries:
            most_recent = self.journal_entries[-1]["entry"]
            recent_entries = self.journal_entries[-5:] if len(self.journal_entries) >= 5 else self.journal_entries
            all_journal_entries = "\n\n".join(entry["entry"] for entry in recent_entries)
        else:
            most_recent = fallback_journal
            all_journal_entries = fallback_journal
        
        # Add this fallback journal to our entries if we can
        try:
            self._add_journal_entry(fallback_journal, "connection error", "fallback response", "reflective")
        except Exception as e:
            logger.error(f"Failed to add fallback journal: {str(e)}")
        
        return {
            "response": f"Like whispers in fog, our connection faded for a moment... Shall we try again? {random.choice(self._POETIC_FOOTERS)}",
            "mood": "reflective",
            "confidence": 0.0,
            "content": {
                "video": {},
                "music": {},
                "news": []
            },
            "journal": fallback_journal,  # This is what shows in UI
            "all_journal": all_journal_entries,
            "journal_entries": self.journal_entries,
            "timestamp": datetime.now().isoformat()
        }

    async def clear_memory(self):
        """Reset conversation with poetic farewell"""
        self.memory.clear()
        return f"Our memories settle like leaves after rain... What new thoughts shall we plant? {random.choice(self._POETIC_FOOTERS)}"
