from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import logging
import os
import re
import json
from datetime import datetime
import httpx  # For Spotify API calls
import base64
import secrets
from starlette.responses import RedirectResponse
from typing import List, Optional
from backend.mcp.message_handler import MessageHandler
from backend.utils.tts import TTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AURA Backend - HER Style Interaction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from the production build (your React app)
app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")

@app.get("/favicon.ico")
async def get_favicon():
    if os.path.exists("frontend/build/favicon.ico"):
        return FileResponse("frontend/build/favicon.ico")
    return {"status": "No favicon"}

# Initialize MessageHandler with voice enabled
handler = MessageHandler(use_voice=True)
tts_engine = TTS()  # Keep this for direct TTS use if needed

class ChatRequest(BaseModel):
    user_input: str

class JournalEntry(BaseModel):
    entry: str
    timestamp: str
    user_input: str
    mood: str
    id: str

def clean_llm_response(text):
    """Remove all LLM debug information from response text."""
    # First cut at newline if text has debug information
    if '\n' in text and ('generation' in text.lower() or 'llm_output' in text.lower()):
        text = text.split('\n', 1)[0]
    
    # Clean all potential artifacts
    patterns = [
        r'\s*generations=.*$',
        r'\s*llm_output=.*$', 
        r'\s*run=.*$',
        r'\s*type=.*$',
        r'\s*LLMResult.*$',
        r'\s*Generation\(.*$',
        r'\s*UUID\(.*$',
        r'Follow-up question:.*$'
    ]
    
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    return text.strip()

async def _filter_response(response: str) -> str:
    """Sanitizes and poetically refines responses using async LLM"""
    # Stage 1: Technical Sanitization
    tech_filters = [
        r"(generations|llm_output|run|type)\s*=\s*[^\)]+",
        r"Generation\([^)]+\)",
        r"UUID\([^)]+\)",
        r"\b(token_usage|model_name)=[^\s]+",
        r"Follow-up question:.*"
    ]
    for pattern in tech_filters:
        response = re.sub(pattern, "", response, flags=re.IGNORECASE)
    
    # Stage 2: LLM Poetic Refinement
    refinement_prompt = f"""Transform this into HER's style:
    {response[:300]}  # Prevent context overflow
    
    Rules:
    - 12-25 words max
    - Use nature metaphors
    - No markdown
    - End with ellipsis (...) or em dash (—)
    - Avoid first-person pronouns
    """
    
    try:
        # Assuming handler has async-capable LLM client
        llm_result = await handler.llm.agenerate(
            messages=[{"role": "system", "content": refinement_prompt}],
            max_tokens=48
        )
        refined = llm_result.generations[0][0].text.strip()
    except Exception as e:
        logger.error(f"Refinement failed: {str(e)}")
        refined = response  # Fallback to original
    
    # Stage 3: Style Enforcement
    style_rules = [
        (r'\b(I|me|my)\b', '', re.IGNORECASE),
        (r'[.!]$', '...'),
        (r'\s{2,}', ' ')
    ]
    
    for pattern, repl, flags in style_rules:
        refined = re.sub(pattern, repl, refined, flags=flags)
    
    return refined[:147].rsplit(' ', 1)[0] + '...' if len(refined) > 150 else refined

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not request.user_input.strip():
        raise HTTPException(status_code=400, detail="Input required")
    try:
        # Process the message with the handler
        aura_result = await handler.process_message(request.user_input)
        
        # Handle the response field mismatch and clean debugging information
        raw_response = str(aura_result.get("response", aura_result.get("message", "")))
        # Clean the response to remove LangChain debugging info
        final_response = clean_llm_response(raw_response)
        
        # Extract mood with proper default and logging
        mood = aura_result.get("mood", "neutral").lower()
        logger.info(f"Extracted mood: {mood}")
        
        # Properly parse confidence with validation
        try:
            confidence = float(aura_result.get("confidence", 0.7))
        except (ValueError, TypeError):
            logger.warning("Invalid confidence value, using default")
            confidence = 0.7
            
        # Extract content with proper defaults for each field
        content = aura_result.get("content", {})
        if not isinstance(content, dict):
            logger.warning(f"Content is not a dict: {type(content)}, using empty dict")
            content = {}
            
        # Get only the most recent journal entry
        journal_entries = aura_result.get("journal_entries", [])
        most_recent_journal = ""
        
        if journal_entries and len(journal_entries) > 0:
            # Sort by timestamp to find most recent
            most_recent_journal = max(
                journal_entries, 
                key=lambda x: x.get("timestamp", "")
            ).get("entry", "")
        else:
            # Fallback to the current journal string
            most_recent_journal = aura_result.get("journal", "")
        
        # Include context keyphrases if available
        context_keyphrases = content.get("context_keyphrases", [])
        
        # Prepare the complete response object with only the most recent journal
        response_obj = {
            "response": final_response,
            "mood": mood,
            "confidence": confidence,
            "content": {
                "video": content.get("video", {}),
                "music": content.get("music", {}),
                "news": content.get("news", []),
                "context_keyphrases": context_keyphrases
            },
            "journal": most_recent_journal,  # Only include the most recent journal entry
            "timestamp": datetime.now().isoformat()
        }
        
        # Log the complete response for debugging
        logger.info(f"Sending response: {response_obj}")
        
        return response_obj
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return {
            "response": "Let's sit with this moment together...",
            "mood": "neutral",
            "confidence": 0.0,
            "content": {
                "video": {},
                "music": {},
                "news": [],
                "context_keyphrases": []
            },
            "journal": "",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/journal", response_model=List[JournalEntry])
async def get_journal_history(limit: Optional[int] = Query(None, description="Limit number of entries"), 
                              skip: Optional[int] = Query(0, description="Skip entries")):
    """
    Retrieve journal history from the JSON file.
    Optional query parameters:
    - limit: Maximum number of entries to return
    - skip: Number of entries to skip (for pagination)
    """
    try:
        # Path to journal history file
        journal_path = "backend/data/journal_history.json"
        
        # Read the journal history file
        with open(journal_path, "r", encoding="utf-8") as f:
            journal_entries = json.load(f)
        
        # Sort entries by timestamp in descending order (newest first)
        journal_entries.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Apply pagination if requested
        if skip > 0:
            journal_entries = journal_entries[skip:]
        if limit is not None:
            journal_entries = journal_entries[:limit]
            
        return journal_entries
        
    except Exception as e:
        logger.error(f"Error fetching journal history: {str(e)}")
        return []

@app.get("/spotify-auth")
async def spotify_auth():
    """
    Returns the Spotify authorization URL.
    Your frontend calls this endpoint to retrieve the URL,
    and then redirects the user to Spotify for login.
    """
    state = secrets.token_hex(16)
    client_id = "6d8e3e5b5030499a8286bf020040678a"  # Your Spotify Client ID
    redirect_uri = "http://localhost:8000/callback"  # Must match your Spotify settings
    scope = "streaming user-read-playback-state user-modify-playback-state"

    auth_url = (
        "https://accounts.spotify.com/authorize?"
        f"client_id={client_id}"
        "&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    return {"auth_url": auth_url}

@app.get("/callback")
async def spotify_callback(code: str, state: str = None):
    """
    Handles the callback from Spotify after user login.
    Exchanges the authorization code for an access token and refresh token.
    Redirects the user to the frontend with tokens in the URL hash so the client
    (via AppContext.js) can initialize the Spotify Web Playback SDK to play music.
    """
    client_id = "6d8e3e5b5030499a8286bf020040678a"   # Your Spotify Client ID
    client_secret = "796f63ea240f4e8484f7a27cc32fd0f9"  # Your Spotify Client Secret
    redirect_uri = "http://localhost:8000/callback"

    auth_str = f"{client_id}:{client_secret}"
    b64_auth_str = base64.b64encode(auth_str.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri
            },
            headers={
                "Authorization": f"Basic {b64_auth_str}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

        if response.status_code != 200:
            # Could not exchange code for token; redirect with error flag
            return RedirectResponse(url="/?error=spotify_auth_failed")
            
        token_data = response.json()
        # Redirect to frontend with tokens in URL hash for client-side processing
        return RedirectResponse(
            url=(
                f"/#access_token={token_data['access_token']}"
                f"&refresh_token={token_data.get('refresh_token', '')}"
                f"&expires_in={token_data.get('expires_in', 3600)}"
            )
        )

@app.get("/")
async def serve_app():
    """
    Serves the main React app from the build folder.
    """
    return FileResponse("frontend/build/index.html")

@app.get("/{path:path}")
async def catch_all(path: str):
    """
    Serves any other path from the build folder (for React Router support).
    """
    file_path = f"frontend/build/{path}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse("frontend/build/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
