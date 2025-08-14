# agents/write_html_code.py
import os
import sys
import tempfile
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain import hub
from base.state import State
from base.base_agent import BaseAgent
from langchain.schema import HumanMessage

# Charger le prompt une seule fois pour éviter un pull à chaque run
PROMPT_AFTER_PLANNING = hub.pull("dev-assistant/html_generator")

def atomic_write(path: str, data: str) -> None:
    """
    Atomically writes data to a file to prevent corruption.
    Args:
        path (str): The target file path.
        data (str): The data to write.
    """
    directory = os.path.dirname(path) or "."
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".tmp_", suffix=".html")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
            tmp_file.write(data)
        os.replace(tmp_path, path)  # Atomically replace the existing file
    finally:
        # Clean up if os.replace was not called
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


class WriteHtmlCode(BaseAgent):
    """
    Agent that generates HTML code based on user message, existing HTML, and design plan.
    """
    def __init__(self):
        super().__init__("Write Html Code Agent", "An agent that writes HTML code.")

    def run(self, user_message: str, existing_html_content: str, design_plan: str) -> str:
        """
        Generates HTML code using a prompt from the LangChain hub.
        Args:
            user_message (str): The user's input message.
            existing_html_content (str): The current HTML content to consider.
            design_plan (str): The design plan for the HTML.
        Returns:
            str: The generated HTML code.
        """
        prompt_value = PROMPT_AFTER_PLANNING.invoke({
            "user_message": user_message,
            "existing_html_content": existing_html_content,
            "design_plan": design_plan
        })
        intent_response = self.invoke(prompt_value)
        return intent_response.content


def write_html_code_node(state: State) -> State:
    """
    Node function to generate HTML code and update the workflow state.
    Args:
        state (State): The current workflow state.
    Returns:
        State: Updated state with the final HTML content and message.
    """
    agent = WriteHtmlCode()
    return_response = agent.run(
        state.get("initial_user_message", ""),
        state.get("existing_html_content", ""),
        state.get("design_plan", "")
    )
    try:
        atomic_write("templates/generated/page.html", return_response)
    except Exception as write_error:
        raise write_error
    return {
        "final_html_content": return_response,
        "messages": state.get("messages", []) + [HumanMessage(content=return_response)]
    }


if __name__ == "__main__":
    agent = WriteHtmlCode()
    print("==> [INFO]:", agent.run("Generate a minimal personal site with About, Projects, and Contact sections.", "", ""))