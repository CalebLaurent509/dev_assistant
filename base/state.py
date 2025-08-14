# agents/state.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from typing_extensions import TypedDict, NotRequired
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain.schema import BaseMessage

class State(TypedDict):
    """
    TypedDict representing the workflow state for agents.
    Attributes:
        messages: List of chat messages (with annotation for message handling).
        initial_user_message: The initial message from the user.
        existing_html_content: Optional, current HTML content.
        design_plan: Optional, design plan for the project.
        final_html_content: Optional, final generated HTML content.
        next: Optional, next step in the workflow.
    """
    messages: Annotated[list[BaseMessage], add_messages]
    initial_user_message: str
    existing_html_content: NotRequired[str]
    design_plan: NotRequired[str]
    final_html_content: NotRequired[str]
    next: NotRequired[str]
