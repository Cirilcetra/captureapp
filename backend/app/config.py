from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Firebase settings
    FIREBASE_CREDENTIALS_PATH: str = "credentials/serviceAccountKey.json"
    STORAGE_BUCKET: str
    
    # Temporary directory for video processing
    TEMP_DIR: str = "/tmp"
    
    # OpenAI API settings
    OPENAI_API_KEY: str
    
    # ElevenLabs API settings
    ELEVENLABS_API_KEY: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings() 