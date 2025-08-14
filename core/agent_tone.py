import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain import hub
from base.state import State
from base.base_agent import BaseAgent
from langchain.schema import HumanMessage

class RespondNaturally(BaseAgent):
    """
    Agent that responds naturally to a user's message using a prompt from the LangChain hub.
    """
    def __init__(self):
        super().__init__("Respond Naturally Agent", "An agent that responds naturally to a user's message.")

    def run(self, user_message: str, existing_html_content: str) -> str:
        """
        Generates a natural response to the user's message.
        Args:
            user_message (str): The user's input message.
            existing_html_content (str): The current HTML content to consider.
        Returns:
            str: The agent's response message.
        """
        prompt = hub.pull("dev-assistant/respond_to_user")
        prompt_value = prompt.invoke({"user_message": user_message, "existing_html_content": existing_html_content})
        intent_response = self.invoke(prompt_value)
        return intent_response.content
    
def respond_naturally_node(state: State) -> State:
    """
    Node function to generate a natural response and update the workflow state with the new message.
    Args:
        state (State): The current workflow state.
    Returns:
        State: Updated state with the new message appended.
    """
    agent = RespondNaturally()
    return_response = agent.run(state.get("initial_user_message"), state.get("existing_html_content"))
    existing_messages = state.get("messages", [])
    return {
        "messages": existing_messages + [HumanMessage(content=return_response)]
    }

if __name__ == "__main__":
    agent = RespondNaturally()
    print("==> [INFO]:", agent.run("Hello, world!", ""))