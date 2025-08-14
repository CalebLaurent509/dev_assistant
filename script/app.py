import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import time
import json
import logging
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from core.nodes import build_workflow
from langchain.schema import HumanMessage
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from utils.html_extractor import extract_html_only
from fastapi.responses import HTMLResponse, StreamingResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('chat_app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
# Load environment variables
load_dotenv()

app = FastAPI()
# Add CORS middleware to allow streaming from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Pydantic model for chat request
class ChatMessage(BaseModel):
    """
    Pydantic model for chat message requests.
    """
    message: str

@app.get("/", response_class=HTMLResponse)
async def root():
    pass

@app.post("/chat-message")
async def chat_message(chat_message: ChatMessage):
    """
    FastAPI endpoint to handle chat messages.
    Streams responses from the workflow graph to the client in real time.
    """
    request_id = f"req_{int(time.time())}_{hash(chat_message.message)%1000}"
    logger.info(f"[{request_id}] New chat message received: {chat_message.message[:50]}...")
    try:
        with open("templates/generated/page.html", "r") as f:
            existing_html_content = f.read()
    except FileNotFoundError:
        existing_html_content = ""
    async def response_generator():
        """
        Generator function to stream workflow responses as server-sent events.
        """
        try:
            logger.info(f"[{request_id}] Starting streaming response")
            yield json.dumps({"type": "start", "request_id": request_id}) + "\n"
            graph = build_workflow()
            stream = graph.stream({
                "messages": [HumanMessage(content=chat_message.message)],
                "initial_user_message": chat_message.message,
                "existing_html_content": existing_html_content
            }, stream_mode=["updates", "messages"])
            for chunk in stream:
                if chunk is not None:
                    is_llm_message = isinstance(chunk, tuple) and len(chunk) == 2 and chunk[0] == 'messages'
                    is_update_stream = isinstance(chunk, tuple) and len(chunk) == 2 and chunk[0] == 'updates'
                    if is_llm_message:
                        langgraph_node_info = chunk[1][1]
                        message_from_llm = chunk[1][0]
                        node, value = chunk
                        if value is not None:
                            logger.info(f"[{request_id}] Stream update from {langgraph_node_info['langgraph_node']}: {str(message_from_llm)[:100]}...")
                            yield json.dumps({
                                "type": "update",
                                "node": langgraph_node_info['langgraph_node'],
                                "value": str(message_from_llm.content)
                            }) + "\n"
                    elif is_update_stream:
                        updated_state = chunk[1]
                        node_step_name = list(updated_state.keys())[-1]
                        node, value = chunk
                        if updated_state is not None:
                            logger.info(f"[{request_id}] Stream update from {node}: {str(value)[:100]}...")
                            yield json.dumps({
                                "type": "not_update",
                                "node": node_step_name,
                                "value": str(updated_state)
                            }) + "\n"
                    else:
                        logger.info(f"[{request_id}] Received chunk in unknown format: {type(chunk)}")
        except Exception as e:
            logger.error(f"[{request_id}] Error in stream: {str(e)}", exc_info=True)
            yield json.dumps({
                "type": "error",
                "error": str(e),
                "request_id": request_id
            }) + "\n"
        finally:
            logger.info(f"[{request_id}] Stream completed")
            yield json.dumps({
                "type": "final",
                "node": "final",
                "value": "final"
            }) + "\n"
    return StreamingResponse(response_generator(), media_type="text/event-stream")

@app.get("/chat", response_class=HTMLResponse)
async def chat():
    """
    FastAPI endpoint to serve the chat UI HTML page.
    """
    with open("templates/index.html") as f:
        return f.read()

@app.get("/page", response_class=HTMLResponse)
async def page():
    """
    FastAPI endpoint to serve only the extracted HTML code from the generated page.
    """
    with open("templates/generated/page.html") as f:
        html_content = f.read()
        extracted_html = extract_html_only(html_content)
        print("==> [INFO]: Extracted HTML code from page.html")
        return extracted_html