import os
from pathlib import Path

# Automatically load local .env file if it exists
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except Exception as e:
        print("Notice: Could not load .env file:", e)

class Settings:
    PROJECT_NAME: str = "SehatSanketh AI Healthcare Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "sehat-sanketh-super-secret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Neon PostgreSQL Database Connection URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://neondb_owner:npg_ISrsQv68fBVd@ep-tiny-breeze-b31iet5x-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
    
    # AI API keys loaded strictly from environment or .env (never hardcoded in repo)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Supported Regional Languages (English, Hindi, Kannada, Tamil, Telugu)
    SUPPORTED_LANGUAGES = ["en", "hi", "kn", "ta", "te"]

settings = Settings()
