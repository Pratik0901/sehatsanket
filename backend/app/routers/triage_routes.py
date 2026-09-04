from fastapi import APIRouter, HTTPException
from app.models import TriageRequest, TriageResult
from app.ai_services.triage import triage_service

router = APIRouter(prefix="/triage", tags=["Symptom Triage"])

@router.post("/analyze", response_model=TriageResult)
async def analyze_symptom(req: TriageRequest):
    if not req.symptom_text or len(req.symptom_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Symptom text is required")

    result = await triage_service.analyze_symptoms(
        patient_id=req.patient_id,
        symptom_text=req.symptom_text,
        preferred_lang=req.language,
        conversation_history=req.conversation_history
    )
    return result
