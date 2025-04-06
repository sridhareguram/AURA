# AURA/backend/mcp/mcp_protocol.py
import json
from datetime import datetime

class MCPMessage:
    def __init__(self, sender, receiver, intent, content):
        self.sender = sender
        self.receiver = receiver
        self.intent = intent
        self.content = content
        self.timestamp = datetime.now().isoformat()
    
    def to_json(self):
        return json.dumps({
            "sender": self.sender,
            "receiver": self.receiver,
            "intent": self.intent,
            "content": self.content,
            "timestamp": self.timestamp
        })
    
    @staticmethod
    def from_json(json_str):
        data = json.loads(json_str)
        msg = MCPMessage(
            sender=data.get("sender"),
            receiver=data.get("receiver"),
            intent=data.get("intent"),
            content=data.get("content")
        )
        msg.timestamp = data.get("timestamp")
        return msg
