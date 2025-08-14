import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base.state import State
from dotenv import load_dotenv
from langchain.schema import HumanMessage
from langgraph.graph import StateGraph, START
from core.agent_tone import respond_naturally_node
from core.code_generator import write_html_code_node
from core.design_and_plan import design_and_plan_node
from core.user_query_route import route_initial_user_message_node

load_dotenv()

def build_workflow():
    """
    Constructs and compiles the workflow graph for handling user messages.
    Returns:
        StateGraph: The compiled workflow graph.
    """
    graph_builder = StateGraph(State)
    # Add nodes for each workflow step
    graph_builder.add_node("route_initial_user_message", route_initial_user_message_node)
    graph_builder.add_node("respond_naturally", respond_naturally_node)
    graph_builder.add_node("design_and_plan", design_and_plan_node)
    graph_builder.add_node("write_html_code", write_html_code_node)
    # Define edges between nodes
    graph_builder.add_edge(START, "route_initial_user_message")
    graph_builder.add_conditional_edges(
        "route_initial_user_message",
        lambda x: x["next"],
        {
            "respond_naturally": "respond_naturally",
            "design_and_plan": "design_and_plan",
        }
    )
    graph_builder.add_edge("design_and_plan", "write_html_code")
    graph = graph_builder.compile()
    return graph

# Only run this code when the file is executed directly
if __name__ == "__main__":
    graph = build_workflow()
    output = graph.invoke({"messages": [HumanMessage(content="Please change this background to white")]})
    print("==> [INFO]:", output)