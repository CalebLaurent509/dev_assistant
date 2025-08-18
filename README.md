
# Dev Assistance
![GitHub Stars](https://img.shields.io/github/stars/CalebLaurent509/dev_assistant?style=social)
![GitHub Forks](https://img.shields.io/github/forks/CalebLaurent509/dev_assistant?style=social)


Dev Assistance is a web application based on FastAPI and LangChain, designed to help developers generate, plan, and modify HTML pages through an intelligent chat interface.

## Main Features

- **Interactive chat**: Modern user interface for chatting with the assistant.
- **HTML code generation**: Create and modify HTML pages based on user requests.
- **Design and planning**: Dedicated agent for design and planning before code generation.
- **Modular workflow**: Orchestrates steps using an agent graph (LangChain/Graph).
- **Live preview**: Instantly view generated HTML in an iframe.

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/CalebLaurent509/dev_assistant.git
   cd dev_assistant
   ```

2. **Install Python dependencies**

```bash
pip install -r requirements.txt
```

This installs FastAPI, LangChain, OpenAI API client, and other required libraries.

3. **Configure environment variables**

   - Create a `.env` file at the root and add your OpenAI key:

     ```env
     OPENAI_API_KEY=sk-...
     ```

## Getting Started

Start the FastAPI server:

```bash
python run.py
```

Access the web interface: [http://localhost:8000/chat](http://localhost:8000/chat)


## Project Structure

```text
/dev_assistant/
├── run.py                      # FastAPI server launcher
├── script/app.py               # Main FastAPI application
├── templates/
│   ├── index.html              # Chat UI
│   ├── style.css, live-preview.css
│   └── generated/page.html     # Dynamically generated HTML page
├── core/
│   ├── nodes.py                # Workflow graph construction
│   ├── code_generator.py       # HTML code generation agent
│   ├── design_and_plan.py      # Design/planning agent
│   ├── agent_tone.py           # Natural response agent
│   └── user_query_route.py     # User query routing
├── base/
│   ├── base_agent.py           # Base class for agents
│   └── state.py                # Workflow state structure
├── utils/
│   ├── html_extractor.py       # HTML code extraction
│   └── get_numbered_code.py    # File line numbering
└── README.md                   # This file
```

## Workflow Diagram

```
User
 │
 │ Chat message
 ▼
FastAPI Backend
 │
 ▼
LangChain Workflow
 │
 ├─> Intent Routing
 │     ├─> Design & Plan Agent
 │     │     └─> HTML Code Generator Agent
 │     │           └─> Write to page.html
 │     │                 └─> Live Preview (iframe)
 │     └─> Natural Response Agent
 │
 └─> Serve /chat & /page
 │
 ├─> User sees updated page
 └─> User sees assistant reply
```

## API

- **POST `/chat-message`**: Send a user message, receive the agent's response (SSE streaming).
- **GET `/chat`**: Serves the chat web interface.
- **GET `/page`**: Serves only the extracted HTML code from the generated page.

## Technologies Used

- **FastAPI**
- **LangChain** (agents, graph)
- **OpenAI API**
- **HTML/CSS/JS** (frontend)
- **PrismJS, Marked.js** (advanced UI)

## Customization

- Modify prompts in LangChain Hub to adapt agent behavior.
- Customize the frontend in `templates/index.html` and related CSS/JS files.


## License

This project is licensed under the MIT License.


## Contact

GitHub: [CalebLaurent509](https://github.com/CalebLaurent509)


