# agents/route_initial_user_message.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain import hub
from base.state import State
from base.base_agent import BaseAgent

# Cache du prompt (évite de tirer le hub à chaque requête)
_PROMPT_DETERMINE_INTENT = hub.pull("dev-assistant/determine_user_intent")

# Mapping des intents normalisés -> next step
INTENT_TO_NEXT = {
    "WRITE_CODE": "design_and_plan",
    "RESPOND_NATURALLY": "respond_naturally",
}

class RouteInitialUserMessage(BaseAgent):
    """
    Agent that routes the initial user message to the appropriate next agent based on intent.
    """
    def __init__(self):
        super().__init__(
            "Route Initial User Message Agent",
            "An agent that routes the initial user message to the appropriate agent."
        )

    def run(self, user_message: str, existing_html_content: str) -> str:
        """
        Determines the intent of the user message using a prompt from the LangChain hub.
        Args:
            user_message (str): The user's input message.
            existing_html_content (str): The current HTML content to consider.
        Returns:
            str: The normalized intent string.
        """
        prompt_value = _PROMPT_DETERMINE_INTENT.invoke({
            "user_message": user_message,
            "existing_html_content": existing_html_content or ""
        })
        msg = self.invoke(prompt_value)
        return getattr(msg, "content", str(msg)).strip()

def route_initial_user_message_node(state: State) -> State:
    """
    Node function to route the initial user message and update the workflow state with the next step.
    Args:
        state (State): The current workflow state.
    Returns:
        State: Updated state with the next step.
    """
    agent = RouteInitialUserMessage()
    user_msg = (state.get("initial_user_message") or "").strip()
    existing_html = state.get("existing_html_content") or ""
    raw_intent = agent.run(user_msg, existing_html)
    norm_intent = raw_intent.strip().upper().replace("-", "_")
    next_step = INTENT_TO_NEXT.get(norm_intent, "respond_naturally")
    return {"next": next_step}

if __name__ == "__main__":
    agent = RouteInitialUserMessage()
    print("==> [INFO]:", agent.run("Hello, world!", ""))
