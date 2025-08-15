import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from abc import ABC, abstractmethod
from models.llm_model import get_llm

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY") 

class BaseAgent(ABC):
    """
    Abstract base class for agents using an LLM model.
    Provides initialization and invocation logic for subclasses.
    """
    def __init__(self, name: str, description: str):
        """
        Initialize the agent with a name, description, and LLM model.
        Args:
            name (str): The name of the agent.
            description (str): A description of the agent's purpose.
        """
        self.name = name
        self.description = description
        self.llm = get_llm(
            model_name="gpt-4o",
            temperature=1.0,
            api_key=api_key,
            max_tokens=6048,
            timeout=60
        )

    @abstractmethod
    def run(self, input: str) -> str:
        """
        Abstract method to be implemented by subclasses for agent execution.
        Args:
            input (str): The input to process.
        Returns:
            str: The agent's response.
        """
        pass

    def invoke(self, input: str) -> str:
        """
        Invoke the LLM model with the given input and return its response.
        Args:
            input (str): The input to send to the LLM.
        Returns:
            str: The LLM's response.
        """
        return self.llm.invoke(input)
