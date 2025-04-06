import logging
import openai
from backend.config.config import Config

logger = logging.getLogger(__name__)

class BaseAgent:
    """Base class for all AURA agents providing common functionality"""
    
    def __init__(self):
        self.api_key = Config.OPENAI_API_KEY
        
    async def _generate_with_openai(self, system, user, model="gpt-4", temperature=0.7, max_tokens=500):
        """Generate text using OpenAI API with proper error handling"""
        try:
            response = await openai.ChatCompletion.acreate(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                api_key=self.api_key
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise
