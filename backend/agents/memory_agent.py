import json
import os
import asyncio
import logging
from datetime import datetime
import aiofiles

logger = logging.getLogger(__name__)

class MemoryAgent:
    _lock = asyncio.Lock()
    
    def __init__(self, log_file=None):
        if log_file is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))  # Directory of memory_agent.py
            log_file = os.path.join(base_dir, "..", "logs", "user_states.json")
            log_file = os.path.normpath(log_file)  # Clean the path

        self.log_file = log_file

        if not os.path.exists(self.log_file):
            os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
            with open(self.log_file, "w") as f:
                json.dump([], f)
    
    async def store_event(self, user_input, mood, confidence):
        # Store timestamp as a formatted string that's easier to parse
        current_time = datetime.now()
        event = {
            "timestamp": current_time.isoformat(),  # ISO format for consistency
            "user_input": user_input,
            "mood": mood,
            "confidence": confidence
        }
        async with self._lock:
            try:
                async with aiofiles.open(self.log_file, mode="r") as f:
                    content = await f.read()
                    data = json.loads(content) if content else []
                    if not isinstance(data, list):
                        logger.warning("Invalid data format - resetting to empty list")
                        data = []
            except Exception as e:
                logger.error("Error reading log file: %s", e)
                data = []
                
            data.append(event)
            
            try:
                async with aiofiles.open(self.log_file, mode="w") as f:
                    await f.write(json.dumps(data, indent=2))
            except Exception as e:
                logger.error("Error writing to log file: %s", e)
        return event

    async def get_memory_log(self):
        async with self._lock:
            try:
                async with aiofiles.open(self.log_file, mode="r") as f:
                    content = await f.read()
                    data = json.loads(content) if content else []
                    if not isinstance(data, list):
                        logger.warning("Memory log corrupted - returning empty list")
                        return []
                    
                    # Return the most recent 10 events
                    recent_events = data[-10:]
                    return recent_events
            except Exception as e:
                logger.error("Error reading log file: %s", e)
                return []
