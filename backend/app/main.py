from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    auth_routes,
    triage_routes,
    doctor_routes,
    emergency_routes,
    hospital_routes,
    reminder_routes,
    video_routes,
    lab_routes,
    digital_twin_routes
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Backend API Gateway for SehatSanketh: Multilingual AI-Powered Healthcare Platform"
)

# CORS Middleware to support frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(triage_routes.router)
app.include_router(doctor_routes.router)
app.include_router(emergency_routes.router)
app.include_router(hospital_routes.router)
app.include_router(reminder_routes.router)
app.include_router(video_routes.router)
app.include_router(lab_routes.router)
app.include_router(digital_twin_routes.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "supported_languages": ["en", "hi", "kn", "ta", "te"],
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2026-09-03"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
