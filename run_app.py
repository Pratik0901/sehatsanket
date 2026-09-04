import subprocess
import sys
import time
import os

def main():
    print("==================================================================")
    print("      SehatSanketh AI Multilingual Healthcare Platform           ")
    print("==================================================================")
    print("Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.join(os.getcwd(), "backend")
    )

    print("Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(os.getcwd(), "frontend"),
        shell=True
    )

    print("\n✓ Both services started successfully!")
    print("  - Frontend UI: http://localhost:5173")
    print("  - Backend API Docs: http://127.0.0.1:8000/docs")
    print("\nPress Ctrl+C to terminate both servers.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down SehatSanketh servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
