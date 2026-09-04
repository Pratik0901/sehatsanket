import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from app.ai_services.translation import translation_service
from app.database import db

router = APIRouter(prefix="/consultation", tags=["Video Consultation"])

class VideoChatMessage(BaseModel):
    sender_role: str  # 'patient' or 'doctor'
    text: str
    source_language: str
    target_language: str

class TTSRequest(BaseModel):
    text: str
    target_language: str

class CallStartRequest(BaseModel):
    consultation_id: str
    doctor_name: str
    doctor_specialty: Optional[str] = "Senior Consultant Physician"
    patient_name: str
    preferred_language: Optional[str] = "en"

class CallEndRequest(BaseModel):
    consultation_id: str
    sender_role: Optional[str] = "participant"

class CallDeclineRequest(BaseModel):
    consultation_id: str
    patient_name: Optional[str] = "Patient"

# Active incoming/in-progress video calls registry
active_calls: Dict[str, Dict[str, Any]] = {}

class ConnectionManager:
    def __init__(self):
        # Consultation room connections: room_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Global signaling subscribers (listening for incoming calls, call status across pages)
        self.global_subscribers: List[WebSocket] = []

    async def connect(self, consultation_id: str, websocket: WebSocket):
        await websocket.accept()
        if consultation_id not in self.active_connections:
            self.active_connections[consultation_id] = []
        self.active_connections[consultation_id].append(websocket)

    def disconnect(self, consultation_id: str, websocket: WebSocket):
        if consultation_id in self.active_connections:
            if websocket in self.active_connections[consultation_id]:
                self.active_connections[consultation_id].remove(websocket)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_subscribers.append(websocket)

    def disconnect_global(self, websocket: WebSocket):
        if websocket in self.global_subscribers:
            self.global_subscribers.remove(websocket)

    async def broadcast_room(self, consultation_id: str, message: dict):
        if consultation_id in self.active_connections:
            for connection in list(self.active_connections[consultation_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_except(self, consultation_id: str, message: dict, sender_ws: WebSocket):
        if consultation_id in self.active_connections:
            for connection in list(self.active_connections[consultation_id]):
                if connection != sender_ws:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def broadcast_global(self, message: dict):
        for connection in list(self.global_subscribers):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.get("/{consultation_id}")
def get_consultation(consultation_id: str):
    session = db.consultations.get(consultation_id)
    if not session:
        return {
            "id": consultation_id,
            "patient_name": "Priya Sharma",
            "doctor_name": "Dr. Rajesh Rao",
            "status": "In-Progress",
            "language_pair": "hi-en",
            "transcript": [
                {"speaker": "System", "text": "Real-time bilingual Sarvam AI translation stream active.", "time": "Just now"}
            ]
        }
    return session

@router.post("/tts")
async def generate_speech_audio(req: TTSRequest):
    """Generates natural Indian voice audio using Sarvam AI or regional Google TTS"""
    audio_b64 = await translation_service.generate_sarvam_speech(req.text, req.target_language)
    if not audio_b64:
        return {"has_audio": False, "audio_base64": None}
    mime_format = "audio/wav" if audio_b64.startswith("UklGR") else "audio/mpeg"
    engine_name = "Sarvam AI bulbul:v3" if translation_service.sarvam_key else "SehatSanketh Indic Speech Engine"
    return {
        "has_audio": True,
        "audio_base64": audio_b64,
        "format": mime_format,
        "engine": engine_name
    }

# --- Call State Signaling Endpoints ---
@router.post("/call/start")
async def start_call(req: CallStartRequest):
    call_info = {
        "consultation_id": req.consultation_id,
        "consultationId": req.consultation_id,
        "doctor_name": req.doctor_name,
        "doctorName": req.doctor_name,
        "doctor_specialty": req.doctor_specialty,
        "doctorSpecialty": req.doctor_specialty,
        "patient_name": req.patient_name,
        "patientName": req.patient_name,
        "preferred_language": req.preferred_language,
        "status": "ringing",
        "created_at": datetime.now().isoformat()
    }
    active_calls[req.consultation_id] = call_info

    incoming_event = {
        "type": "INCOMING_CALL",
        "consultationId": req.consultation_id,
        "doctorName": req.doctor_name,
        "doctorSpecialty": req.doctor_specialty,
        "patientName": req.patient_name,
        "timestamp": datetime.now().timestamp()
    }
    await manager.broadcast_global(incoming_event)
    await manager.broadcast_room(req.consultation_id, incoming_event)
    return {"status": "ringing", "call": call_info}

@router.post("/call/end")
async def end_call(req: CallEndRequest):
    call_info = active_calls.pop(req.consultation_id, None)
    end_event = {
        "type": "CALL_ENDED",
        "consultationId": req.consultation_id,
        "by": req.sender_role,
        "timestamp": datetime.now().timestamp()
    }
    await manager.broadcast_room(req.consultation_id, end_event)
    await manager.broadcast_global(end_event)
    return {"status": "ended", "consultation_id": req.consultation_id}

@router.post("/call/decline")
async def decline_call(req: CallDeclineRequest):
    active_calls.pop(req.consultation_id, None)
    decline_event = {
        "type": "CALL_DECLINED",
        "consultationId": req.consultation_id,
        "patientName": req.patient_name,
        "timestamp": datetime.now().timestamp()
    }
    await manager.broadcast_room(req.consultation_id, decline_event)
    await manager.broadcast_global(decline_event)
    return {"status": "declined", "consultation_id": req.consultation_id}

@router.get("/call/active")
def get_active_calls():
    return {"active_calls": list(active_calls.values())}

@router.post("/{consultation_id}/message")
async def post_consultation_message(consultation_id: str, msg: VideoChatMessage):
    session = db.consultations.get(consultation_id)
    if not session:
        session = {
            "id": consultation_id,
            "patient_name": "Patient",
            "doctor_name": "Doctor",
            "status": "In-Progress",
            "language_pair": f"{msg.source_language}-{msg.target_language}",
            "transcript": []
        }
        db.consultations[consultation_id] = session

    # 1. Translation
    sarvam_translation = await translation_service.translate_with_sarvam(
        text=msg.text,
        target_lang=msg.target_language,
        source_lang=msg.source_language
    )
    
    translated_text = sarvam_translation or translation_service.translate_text(
        text=msg.text,
        target_lang=msg.target_language,
        source_lang=msg.source_language
    )

    # 2. Native speech audio
    audio_b64 = await translation_service.generate_sarvam_speech(translated_text, msg.target_language)

    entry = {
        "speaker": msg.sender_role.capitalize(),
        "original_text": msg.text,
        "translated_text": translated_text,
        "source_language": msg.source_language,
        "target_language": msg.target_language,
        "audio_base64": audio_b64,
        "translation_engine": "Sarvam AI (Indian Languages)",
        "time": datetime.now().strftime("%H:%M:%S")
    }

    session.setdefault("transcript", []).append(entry)
    db.save_consultation(session)

    return {
        "message_entry": entry,
        "consultation_id": consultation_id,
        "audio_base64": audio_b64
    }

# --- Global Signaling WebSocket ---
@router.websocket("/ws/signal")
async def websocket_global_signaling(websocket: WebSocket):
    await manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")
            if msg_type == "START_CALL":
                cid = payload.get("consultationId", "consult_01")
                active_calls[cid] = payload
                await manager.broadcast_global({
                    "type": "INCOMING_CALL",
                    **payload
                })
            elif msg_type == "CALL_ENDED":
                cid = payload.get("consultationId")
                if cid:
                    active_calls.pop(cid, None)
                await manager.broadcast_global(payload)
            elif msg_type == "CALL_DECLINED":
                cid = payload.get("consultationId")
                if cid:
                    active_calls.pop(cid, None)
                await manager.broadcast_global(payload)
            elif msg_type == "PING":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect_global(websocket)
    except Exception:
        manager.disconnect_global(websocket)

# --- Room Media & Speech Stream WebSocket ---
@router.websocket("/{consultation_id}/stream")
async def websocket_consultation_stream(websocket: WebSocket, consultation_id: str):
    await manager.connect(consultation_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type", "chat")

            # 1. WebRTC Signaling and Call State Relaying
            if msg_type in ["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE", "PEER_JOINED", "PEER_READY", "CALL_ENDED", "CALL_DECLINED", "PING"]:
                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                    continue
                if msg_type == "CALL_ENDED":
                    active_calls.pop(consultation_id, None)
                    await manager.broadcast_global(payload)
                await manager.broadcast_except(consultation_id, payload, websocket)
                continue

            # 2. Client-Processed Speech Turn (relay to peer, discard empty/blank)
            if msg_type == "NEW_SPEECH_TURN":
                msg_data = payload.get("message") or {}
                orig = (msg_data.get("original") or "").strip()
                trans = (msg_data.get("translated") or "").strip()
                if not orig and not trans:
                    # Ignore empty/dummy speech turn completely
                    continue

                # Broadcast to peer in room
                await manager.broadcast_except(consultation_id, payload, websocket)

                if consultation_id in db.consultations:
                    consult = db.consultations[consultation_id]
                    consult.setdefault("transcript", []).append({
                        "speaker": msg_data.get("speaker", "Participant"),
                        "original_text": orig,
                        "translated_text": trans,
                        "source_language": msg_data.get("sourceLang", "en"),
                        "target_language": msg_data.get("targetLang", "en"),
                        "audio_base64": msg_data.get("audioBase64"),
                        "time": msg_data.get("time", datetime.now().strftime("%H:%M:%S"))
                    })
                    db.save_consultation(consult)
                continue

            # 3. Raw Speech / Translation Request (STRICTLY REQUIRE NON-EMPTY TEXT)
            text = (payload.get("text") or payload.get("original_text") or "").strip()
            if not text:
                # If there's no actual spoken/typed text, NEVER generate a speech turn or quotes
                if msg_type not in ["chat", "message"]:
                    await manager.broadcast_except(consultation_id, payload, websocket)
                continue

            src_lang = payload.get("source_language", "en")
            tgt_lang = payload.get("target_language", "en")
            role = payload.get("sender_role", "participant")
            speaker = payload.get("speaker") or role.capitalize()

            translated = text
            if src_lang != tgt_lang:
                sarvam_trans = await translation_service.translate_with_sarvam(text, tgt_lang, src_lang)
                translated = sarvam_trans or translation_service.translate_text(text, tgt_lang, src_lang)

            audio_b64 = await translation_service.generate_sarvam_speech(translated, tgt_lang)

            turn_msg = {
                "id": int(datetime.now().timestamp() * 1000),
                "speaker": speaker,
                "role": role,
                "sourceLang": src_lang,
                "targetLang": tgt_lang,
                "original": text,
                "translated": translated,
                "audioBase64": audio_b64,
                "time": datetime.now().strftime("%I:%M %p")
            }

            turn_caption = {
                "speakerName": speaker,
                "speakerRole": role,
                "sourceLang": src_lang,
                "targetLang": tgt_lang,
                "targetPerson": payload.get("targetPerson", "Participant"),
                "original": text,
                "translated": translated,
                "audioBase64": audio_b64
            }

            event = {
                "type": "NEW_SPEECH_TURN",
                "message": turn_msg,
                "caption": turn_caption,
                "audioToPlay": {
                    "text": translated,
                    "lang": tgt_lang,
                    "b64": audio_b64
                } if audio_b64 and src_lang != tgt_lang else None,
                "engine": "SehatSanketh Indic Voice Engine",
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }

            if consultation_id in db.consultations:
                consult = db.consultations[consultation_id]
                consult.setdefault("transcript", []).append({
                    "speaker": speaker,
                    "original_text": text,
                    "translated_text": translated,
                    "source_language": src_lang,
                    "target_language": tgt_lang,
                    "audio_base64": audio_b64,
                    "time": datetime.now().strftime("%H:%M:%S")
                })
                db.save_consultation(consult)

            await manager.broadcast_room(consultation_id, event)
    except WebSocketDisconnect:
        manager.disconnect(consultation_id, websocket)
    except Exception as e:
        manager.disconnect(consultation_id, websocket)
