from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.openai import OpenAIService
from ..services.elevenlabs import ElevenLabsService
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ScriptRequest(BaseModel):
    car_details: str
    angle_descriptions: List[str]

class NarrationRequest(BaseModel):
    script: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = "eleven_multilingual_v2"
    stability: Optional[float] = 0.5
    similarity_boost: Optional[float] = 0.75

@router.post("/script")
async def generate_script(request: ScriptRequest):
    """Generate a script using OpenAI."""
    try:
        openai_service = OpenAIService()
        script = await openai_service.generate_script(
            request.car_details,
            request.angle_descriptions
        )
        return {"script": script}
    except Exception as e:
        logger.error(f"Error in generate_script endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_voices():
    """Get available voices from ElevenLabs."""
    try:
        elevenlabs_service = ElevenLabsService()
        voices = await elevenlabs_service.get_available_voices()
        return {"voices": voices}
    except Exception as e:
        logger.error(f"Error in get_voices endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/narration")
async def generate_narration(request: NarrationRequest):
    """Generate narration audio using ElevenLabs."""
    try:
        elevenlabs_service = ElevenLabsService()
        audio_data = await elevenlabs_service.generate_narration(
            script=request.script,
            voice_id=request.voice_id,
            model_id=request.model_id,
            stability=request.stability,
            similarity_boost=request.similarity_boost
        )
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=narration.mp3"
            }
        )
    except Exception as e:
        logger.error(f"Error in generate_narration endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 