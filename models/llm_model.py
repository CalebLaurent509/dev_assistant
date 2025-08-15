import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain_community.chat_models import ChatOpenAI

def get_llm(
    model_name="gpt-3.5-turbo",
    temperature=1.0,
    api_key=None,
    max_tokens=None,
    timeout=None
):
    """
    Returns a configured ChatOpenAI instance.

    Args:
        model_name (str): Model name, e.g. 'gpt-3.5-turbo', 'gpt-4', etc.
        temperature (float): Model temperature (0 = more deterministic).
        api_key (str): Your OpenAI key, optional if already in env.
        max_tokens (int): Token limit for response.
        timeout (float): Timeout in seconds.

    Returns:
        ChatOpenAI: Ready to use LLM.
    """
    # Creating new ChatOpenAI instance
    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        openai_api_key=api_key,
        max_tokens=max_tokens,
        timeout=timeout
    )

if __name__ == "__main__":
    # Initializing LLM with test parameters
    llm = get_llm(temperature=0.7)
    # Testing LLM with sample prompt
    response = llm.invoke("Say this is a test!")
    # Test response received
    print(f"==> [OK] Test response: {response.content}")