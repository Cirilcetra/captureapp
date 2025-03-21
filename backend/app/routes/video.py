from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..services.firebase import FirebaseService
from ..services.video import VideoProcessor
from ..models.video import VideoCombineRequest, AudioAddRequest, VideoResponse, ProgressResponse
from pathlib import Path
import asyncio
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
firebase = FirebaseService()
video_processor = VideoProcessor()

# Store progress information
progress_store: Dict[str, Dict] = {}

def update_progress(task_id: str, progress: int, stage: str):
    """Update progress for a specific task"""
    progress_store[task_id] = {"progress": progress, "stage": stage}

@router.post("/combine-videos", response_model=VideoResponse)
async def combine_videos(request: VideoCombineRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"📥 Received combine request for project: {request.project_id}")
        logger.info(f"🎬 Number of videos to combine: {len(request.video_urls)}")
        logger.info(f"🔗 Video URLs: {request.video_urls}")
        
        task_id = f"combine_{request.project_id}"
        progress_store[task_id] = {"progress": 0, "stage": "Initializing"}
        
        # Create output path
        output_name = request.output_name or f"{request.project_id}_combined.mp4"
        output_path = Path(f"/tmp/{output_name}")
        logger.info(f"📁 Output path: {output_path}")
        
        # Download all videos concurrently
        logger.info("⬇️ Starting video downloads...")
        update_progress(task_id, 10, "Downloading videos")
        video_paths = await asyncio.gather(
            *[firebase.download_video(str(url)) for url in request.video_urls]
        )
        logger.info(f"✅ Downloaded {len(video_paths)} videos successfully")
        
        # Combine videos
        logger.info("🔄 Starting video combination...")
        update_progress(task_id, 30, "Combining videos")
        combined_video = await video_processor.combine_videos(
            video_paths,
            output_path,
            lambda p, s: update_progress(task_id, p, s)
        )
        logger.info("✅ Videos combined successfully")
        
        # Upload result
        logger.info("📤 Starting upload of combined video...")
        update_progress(task_id, 90, "Uploading result")
        upload_path = f"combined/{request.project_id}/{output_name}"
        logger.info(f"📁 Upload path: {upload_path}")
        result_url = await firebase.upload_video(
            combined_video,
            upload_path
        )
        logger.info(f"✅ Upload complete. URL: {result_url}")
        
        # Cleanup
        update_progress(task_id, 95, "Cleaning up")
        for path in video_paths:
            firebase.cleanup(path)
        firebase.cleanup(output_path)
        logger.info("🧹 Cleanup complete")
        
        update_progress(task_id, 100, "Complete")
        
        return VideoResponse(
            status="success",
            url=result_url,
            message="Videos combined successfully"
        )
    except Exception as e:
        logger.error(f"❌ Error in combine_videos: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"❌ Response status: {e.response.status_code}")
            logger.error(f"❌ Response text: {e.response.text}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-audio", response_model=VideoResponse)
async def add_audio(request: AudioAddRequest, background_tasks: BackgroundTasks):
    try:
        task_id = f"audio_{request.project_id}"
        progress_store[task_id] = {"progress": 0, "stage": "Initializing"}
        
        # Create output path
        output_name = request.output_name or f"{request.project_id}_with_audio.mp4"
        output_path = Path(f"/tmp/{output_name}")
        
        # Download video and audio
        update_progress(task_id, 10, "Downloading video")
        video_path = await firebase.download_video(str(request.video_url))
        
        update_progress(task_id, 30, "Downloading audio")
        audio_path = await firebase.download_video(str(request.audio_url))
        
        # Add audio to video
        update_progress(task_id, 50, "Adding audio")
        final_video = await video_processor.add_audio(
            video_path,
            audio_path,
            output_path,
            lambda p, s: update_progress(task_id, p, s)
        )
        
        # Upload result
        update_progress(task_id, 90, "Uploading result")
        result_url = await firebase.upload_video(
            final_video,
            f"final/{request.project_id}/{output_name}"
        )
        
        # Cleanup
        update_progress(task_id, 95, "Cleaning up")
        firebase.cleanup(video_path)
        firebase.cleanup(audio_path)
        firebase.cleanup(output_path)
        
        update_progress(task_id, 100, "Complete")
        
        return VideoResponse(
            status="success",
            url=result_url,
            message="Audio added successfully"
        )
    except Exception as e:
        logger.error(f"Error in add_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress/{task_id}", response_model=ProgressResponse)
async def get_progress(task_id: str):
    """Get progress for a specific task"""
    if task_id not in progress_store:
        raise HTTPException(status_code=404, detail="Task not found")
    
    progress_info = progress_store[task_id]
    return ProgressResponse(
        progress=progress_info["progress"],
        stage=progress_info["stage"],
        status="complete" if progress_info["progress"] == 100 else "processing"
    ) 