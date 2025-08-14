import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uvicorn
from script.app import app

if __name__ == "__main__":
    # Start the FastAPI server using Uvicorn
    print("==> [OK]: Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )