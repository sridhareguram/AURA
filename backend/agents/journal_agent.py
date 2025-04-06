import logging
from datetime import datetime
from openai import AsyncOpenAI
from backend.config.config import Config
from backend.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

class JournalAgent(BaseAgent):
    """Creates structured journal entries with proper timestamp handling"""
    
    def __init__(self):
        super().__init__()
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.symbol_cycle = ["🌀", "🌌", "✨", "🌠", "💭"]
        self.time_symbols = {
            "morning": "🌄",
            "day": "☀️",
            "evening": "🌆",
            "night": "🌙"
        }

    async def generate_journal_entry(self, memory_log) -> str:
        """Generate journal entry from conversation history"""
        if not memory_log:
            raise ValueError("Journal requires non-empty memory log")

        latest_entry = memory_log[-1]
        timestamp = self._parse_timestamp(latest_entry.get('timestamp'))
        
        prompt = self._build_prompt(latest_entry, timestamp)
        journal_text = await self._get_llm_response(prompt)
        return self._format_entry(journal_text, timestamp)

    def _build_prompt(self, entry: dict, timestamp: datetime) -> str:
        """Construct structured prompt with conversation context"""
        return f"""Create journal entry with this structure:

        Time: {timestamp.strftime("%H:%M")} {self._get_time_symbol(timestamp)}
        User: "{self._condense_text(entry.get('user_input', ''))}"
        AURA: "{self._condense_text(entry.get('response', ''))}"
        Mood: {entry.get('mood', 'neutral')}

        Guidelines:
        - 3-5 line poetic reflection
        - Connect user/AURA messages using 1 symbol from: {", ".join(self.symbol_cycle)}
        - End with open questions
        - Use simple metaphors related to {entry.get('mood', 'neutral')} mood

        Example:
        22:15 🌙
        You: "Can't see past tomorrow..."
        AURA: "Dawn always follows night" 
        Moonlight traces paths through uncertainty → 🌌
        What constellations will guide your morning?
        """

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Convert ISO timestamp string to datetime object"""
        try:
            return datetime.fromisoformat(timestamp_str)
        except (TypeError, ValueError):
            logger.warning(f"Invalid timestamp: {timestamp_str}, using current time")
            return datetime.now()

    def _get_time_symbol(self, timestamp: datetime) -> str:
        """Get appropriate time-of-day symbol"""
        hour = timestamp.hour
        return (
            self.time_symbols["morning"] if 5 <= hour < 12 else
            self.time_symbols["day"] if 12 <= hour < 17 else
            self.time_symbols["evening"] if 17 <= hour < 21 else
            self.time_symbols["night"]
        )

    def _condense_text(self, text: str) -> str:
        """Shorten text while preserving meaning"""
        return text[:50].strip() + "..." if len(text) > 50 else text

    def _format_entry(self, text: str, timestamp: datetime) -> str:
        """Ensure consistent journal formatting"""
        lines = []
        time_header = f"{timestamp.strftime('%H:%M')} {self._get_time_symbol(timestamp)}"
        symbol_index = 0
        
        for line in text.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            if symbol_index < len(self.symbol_cycle) and "→" in line:
                lines.append(f"{line} {self.symbol_cycle[symbol_index]}")
                symbol_index += 1
            else:
                lines.append(line)
        
        return f"{time_header}\n" + "\n".join(lines)

    async def _get_llm_response(self, prompt):
        """Get structured journal content from LLM"""
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[{
                "role": "system",
                "content": """You are a journal formatter. Create entries that:
                - Start with timestamp and symbol
                - Show actual user/AURA quotes
                - Add 1-2 poetic lines
                - End with reflective question"""
            }, {
                "role": "user", 
                "content": prompt
            }],
            temperature=0.7,
            max_tokens=250
        )
        return response.choices[0].message.content