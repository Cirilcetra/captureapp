import aiohttp
import logging
from ..config import settings

logger = logging.getLogger(__name__)

DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID (Rachel)

class ElevenLabsService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ElevenLabsService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        try:
            if not settings.ELEVENLABS_API_KEY:
                raise ValueError("ElevenLabs API key is not configured")
            
            self.api_key = settings.ELEVENLABS_API_KEY
            self._initialized = True
            logger.info("✅ ElevenLabs service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize ElevenLabs service: {str(e)}")
            raise

    async def get_available_voices(self) -> list:
        """Get list of available voices from ElevenLabs."""
        try:
            logger.info("🎤 Fetching available voices from ElevenLabs")
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://api.elevenlabs.io/v1/voices',
                    headers={'xi-api-key': self.api_key}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        voices = data.get('voices', [])
                        logger.info(f"✅ Successfully fetched {len(voices)} voices")
                        return voices
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to fetch voices: {error_text}")
                        raise Exception(f"Failed to fetch voices: {error_text}")
        except Exception as e:
            logger.error(f"❌ Error fetching voices: {str(e)}")
            raise

    async def generate_narration(
        self,
        script: str,
        voice_id: str = DEFAULT_VOICE_ID,
        model_id: str = "eleven_multilingual_v2",
        stability: float = 0.5,
        similarity_boost: float = 0.75
    ) -> bytes:
        """Generate narration audio from script using ElevenLabs API."""
        try:
            logger.info(f"🎙️ Generating narration with voice ID: {voice_id}")
            logger.info(f"📝 Script length: {len(script)} characters")

            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers={
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': self.api_key,
                    },
                    json={
                        'text': script,
                        'model_id': model_id,
                        'voice_settings': {
                            'stability': stability,
                            'similarity_boost': similarity_boost,
                        }
                    }
                ) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        logger.info(f"✅ Successfully generated narration ({len(audio_data)} bytes)")
                        return audio_data
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to generate narration: {error_text}")
                        raise Exception(f"Failed to generate narration: {error_text}")
        except Exception as e:
            logger.error(f"❌ Error generating narration: {str(e)}")
            raise Exception(f"Failed to generate narration: {str(e)}") 