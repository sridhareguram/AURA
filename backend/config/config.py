import os
import logging
from dotenv import load_dotenv

load_dotenv()  # Loads environment variables from .env

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    YOUTUBE_VIDEO_API_KEY = os.getenv("YOUTUBE_VIDEO_API_KEY")
    YOUTUBE_MUSIC_API_KEY = os.getenv("YOUTUBE_MUSIC_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    # Add Eleven Labs configuration
    ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")
    
    @classmethod
    def validate(cls):
        missing = []
        if not cls.OPENAI_API_KEY:
            missing.append("OPENAI_API_KEY")
        if not cls.YOUTUBE_VIDEO_API_KEY:
            missing.append("YOUTUBE_VIDEO_API_KEY")
        if not cls.YOUTUBE_MUSIC_API_KEY:
            missing.append("YOUTUBE_MUSIC_API_KEY")
        if not cls.TAVILY_API_KEY:
            missing.append("TAVILY_API_KEY")
        if missing:
            logger.warning("Missing configuration for: %s", ", ".join(missing))
        else:
            logger.info("All required API keys are provided.")

Config.validate()

if __name__ == "__main__":
    print("OpenAI API Key:", Config.OPENAI_API_KEY)
