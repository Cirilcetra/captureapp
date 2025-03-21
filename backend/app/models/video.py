from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class VideoCombineRequest(BaseModel):
    project_id: str
    video_urls: List[HttpUrl]
    output_name: Optional[str] = None

class AudioAddRequest(BaseModel):
    project_id: str
    video_url: HttpUrl
    audio_url: HttpUrl
    output_name: Optional[str] = None

class VideoResponse(BaseModel):
    status: str
    url: Optional[HttpUrl] = None
    message: Optional[str] = None
    error: Optional[str] = None

class ProgressResponse(BaseModel):
    progress: int
    stage: str
    status: str = "processing" 