# Luddy Hackathon 4.0 - Luddy Hacks
# AURA - The Empathetic AI: A Multi-Agent System



Hi judges, we’re Team Swayamkrushi, and we built an emotionally intelligent AI system for Luddy Hackathon Case 4.

---

## Abstract

AURA is inspired by the film _Her_, where a man forms a deep emotional bond with an AI companion named Samantha. Drawing from this idea, AURA reimagines what it means for AI to be truly empathetic. It listens, understands, and responds to human emotions through a coordinated system of intelligent agents.

Developed for the Luddy Hackathon Case 4 challenge, AURA is a locally hosted multi-agent AI system aimed at emotional wellness. It combines powerful APIs, thoughtful design, and modular architecture to deliver a deeply human-centric experience.

---

## Problem Statement

**In a world where emotional support is often delayed or unavailable, AURA steps in as a digital companion.** It offers timely, thoughtful responses that help users feel heard, supported, and understood. By blending emotional intelligence with AI, AURA provides reflections, curated content, and calming interactions.

---

## System Overview and Architecture

![Luddy Hack2](https://github.com/user-attachments/assets/900b3bd2-b92b-4821-a899-d02996db1104)



**AURA** (Autonomous Understanding and Reflective Agent) is a HER-inspired, emotionally intelligent Multi-Agent System. It is designed to emulate empathetic companionship by coordinating multiple autonomous agents—each with specialized roles—who collectively process user inputs, analyze emotional states, generate responses, curate content, and maintain contextual memory.

Each agent operates independently with its own decision-making logic, yet all agents collaborate to fulfill shared goals: understanding the user's emotional landscape and offering personalized support. Once launched, the system runs autonomously without manual intervention, dynamically adapting to the user’s evolving mood and interactions.

### Core Design Philosophy

While AURA does not use Microsoft's [AutoGen](https://github.com/microsoft/autogen) framework directly, its architecture mirrors many of its design principles:
- **Autonomous Agents**: Each agent operates independently with distinct behaviors.
- **Message-Passing Protocol**: All agents communicate using a centralized, extensible communication handler.
- **Model Context Protocol (MCP)**: AURA incorporates a custom MCP layer to manage context sharing and task coordination across agents.

### Key Components

- `base_agent.py`:  
  Abstract base class shared by all agents. It wraps LLM communication, error handling, and output formatting. Agents inherit from this class to gain consistent capabilities and standardized prompt structuring.

- `message_handler.py`:  
  Acts as the backbone of inter-agent communication. It dispatches user inputs, tracks agent responses, handles routing logic, and ensures ordered message flow.

- `mcp_protocol.py`:  
  Implements the Model Context Protocol layer. It governs how task context is initialized, updated, and passed between agents during multi-step interactions. This ensures each agent has access to relevant user history, emotional state, and prior outputs.

- `shared_state.json`:  
  A lightweight in-memory and persistent store for storing current mood, conversation history, curated content, journal entries, and more. This ensures continuity in long-running sessions and allows for memory-based personalization.

- `memory_agent.py`:  
  Responsible for recording and retrieving the user's emotional trajectory over time. Stores mood tags, journal metadata, and sentiment markers to help other agents personalize output contextually.

### Autonomous Behavior and Collaboration

Each agent is implemented using rule-based logic, light state machines, and prompt templates tailored to its function. AURA’s architecture supports:
- **Sequential Collaboration**: For example, Emotion Analyzer first classifies sentiment, then the Support Agent builds responses based on that classification.
- **Parallel Agent Execution** (future-ready): Design is extensible to allow asynchronous concurrent agents.
- **Graceful Failure Handling**: The Fallback Agent ensures the system never breaks—even if external APIs fail or models crash.

### Conflict Resolution and Resource Sharing

Agents interact via message queues and operate in a pre-defined execution chain managed by the `mcp_protocol`. To handle contention:
- Shared resources like emotional context and memory state are read/write locked.
- The `Fallback Agent` steps in if an agent fails or times out.
- Prompts include agent-specific memory and task role to prevent context overlap.

**In essence, AURA is an orchestrated symphony of intelligent agents—an emotionally responsive system that listens, reflects, and supports.**

---

## Agents and Their Roles

1. **Base Agent** – Provides shared OpenAI access and prompt handling.  
2. **Curator Agent** – Fetches personalized media using YouTube, Spotify, and Tavily APIs.  
3. **Emotion Analyzer** – Uses a fine-tuned RoBERTa model to classify emotion.  
4. **Fallback Agent** – Ensures graceful recovery and response even on failure.  
5. **Journal Agent** – Creates timestamped poetic logs from user input.  
6. **Memory Agent** – Maintains mood history across sessions.  
7. **Support Agent** – Offers metaphor-rich responses inspired by *Her*.

---
## Technology Stack

**AURA is built using a robust and scalable stack designed for modular agent interaction and seamless user experience.**

### Frontend:
- React.js
- Tailwind CSS
- HTML/CSS

### Backend:
- Python (FastAPI)

### APIs and Tools:
- OpenAI API – Journaling, content generation, mood reflection  
- Spotify API – Music suggestions based on emotional tone  
- YouTube API – Video curation  
- Tavily API – Contextual news articles  
- Tableau API – Data visualization (future integration)  
- ElevenLabs API – Voice input/output

---

## Frontend Dashboard

**The AURA dashboard is the visual heart of the system.** Designed with user experience in mind, it allows seamless interaction between the user and the AI agents.

### Features:
- Live agent status (Working, Idle, Completed)  
- Mood analysis results with graphical feedback  
- Poetic journal entries  
- Voice input/output using ElevenLabs  
- Embedded multimedia content (Spotify, YouTube)

**The dashboard builds user trust by making AI’s thought process transparent and visual.**

---

## Workflow Pipeline

1. User submits text or voice input  
2. Emotion Analyzer detects mood  
3. Memory Agent logs the state  
4. Journal Agent creates a poetic entry  
5. Curator Agent gathers relevant content  
6. Support Agent responds empathetically  
7. Fallback Agent ensures response delivery

---

## Agent Collaboration Strategy

- JSON-based message handling  
- Asynchronous agent execution  
- Logs and fallback checks for smooth flow

---

## Checklist Fulfillment

**AURA satisfies all Case 4 requirements**:  
- A working multi-agent system  
- Seven independent agents with unique logic  
- Real-time visual dashboard

---

## Bonus Features Implemented and How They Added Value

- Voice-based interaction using ElevenLabs API – Enabled natural, immersive experiences  
- Poetic journaling – Created memorable, personalized logs using customised sub queries  
- Media and content curation using YouTube, Spotify, and Tavily APIs – Delivered uplifting media tailored to the user's mood  
- Emotion detection using Hugging Face and OpenAI – Powered empathetic responses  
- Fallback handling logic – Maintained continuity during failures  
- Persistent session memory – Stored mood logs using JSON  
- Zero-shot query classification – Helped agents choose between emotional and factual pathways

---

## What Makes AURA Stand Out

**AURA isn’t just an AI — it’s an experience.** From poetic journaling to real-time voice and mood tracking, every detail is crafted to feel human. The emotional UX and agent coordination bring a sense of presence that most bots can't replicate.

---

## Innovations

- Mood-based media recommendations  
- LLM-powered poetic journaling  
- Emotion-first conversational design  
- Fully custom-built agent protocol  
- Reliable fallback flow

---

## What We Learned

- Emotional design is just as technical as it is creative  
- Asynchronous systems need thoughtful architecture  
- Small touches (like tone, metaphor, and pacing) make AI feel alive  
- Empathy in AI isn't fiction—it's just good engineering

---

## Challenges We Ran Into

- Managing async flows across agents  
- Making LLMs sound naturally empathetic


## Conclusion: 


AURA shows how AI can do more than computer; it can care. By thoughtfully integrating multiple agents, language models, and sensory APIs, AURA delivers a gentle, supportive 
experience. It is a step toward emotionally aware systems that put people first.


## Future Scope:

- Cloud deployment for wider access
- Learning-based personalization
- Integration with wearable health data



## Screenshots

### Conversational Empathy and Agent Overview**  
AURA responds to emotional prompts with poetic empathy while displaying real-time backend agent activity.

![projectsnap1](https://github.com/user-attachments/assets/98b7a677-0139-4034-8886-0fc8530ac97e)

### Curated Content Curation**  
Uses **YouTube**, **Spotify**, and **Tavily** APIs to offer mood-aligned media suggestions.

![prjectsnap2](https://github.com/user-attachments/assets/338c0c5b-8c49-4261-bb77-c5a01c4f8080)


### Poetic Journaling**  
Displays reflective journal entries generated by the **Journal Agent** based on user mood.

![projectsnap3](https://github.com/user-attachments/assets/3681abdc-ec45-4c02-be6a-78725a4e4c0b)


### Mood Timeline**  
Graphs mood changes over time, helping users visualize emotional patterns and emotional history.

![projectsnap4](https://github.com/user-attachments/assets/5eb4e929-22f6-4c77-a931-fd3c63511d25)


### Full Agent Log View**  
Shows raw payloads and sequential outputs of each backend agent for a given user session, ensuring full transparency and traceability.

![projectsnap5](https://github.com/user-attachments/assets/4e61fda0-e9ad-4abb-9b59-e4a4638f28a7)


## Instructions to Run the Project:
To run AURA locally on your system, follow the instructions below:
Clone the project repository from GitHub.


- Install required Python dependencies using pip install -r requirements.txt.


- Set up environment variables or config files with your API keys (OpenAI, Spotify, YouTube, Tavily, ElevenLabs).


- Navigate to the backend directory and start the FastAPI server using uvicorn main:app --reload.


- In a separate terminal, go to the frontend directory and run npm install followed by npm start to launch the React dashboard.


Interact with AURA through the dashboard using either text or voice input.

**Bash Commands to Launch:**
Start Backend:
cd backend
uvicorn main:app --reload

**Start Frontend:**
cd frontend
npm install
npm start

Ensure all APIs are properly authenticated and agents are correctly initialized. For detailed agent behavior, refer to the respective files under the agents/ folder.









