import ffmpeg
from pathlib import Path
import asyncio
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class VideoProcessor:
    @staticmethod
    async def combine_videos(
        video_paths: List[Path],
        output_path: Path,
        progress_callback: Optional[callable] = None
    ) -> Path:
        """Combine videos using FFmpeg for better performance"""
        try:
            # Create temporary file list
            list_path = output_path.parent / 'temp_list.txt'
            with open(list_path, 'w') as f:
                for video_path in video_paths:
                    f.write(f"file '{video_path.absolute()}'\n")
            
            if progress_callback:
                progress_callback(10, "Created file list")
            
            # Use FFmpeg for fast concatenation
            stream = ffmpeg.input(str(list_path), format='concat', safe=0)
            stream = ffmpeg.output(
                stream,
                str(output_path),
                c='copy',  # Use copy codec for speed
                an=None,  # Remove all audio streams
                movflags='+faststart',
                loglevel='error'  # Reduce logging noise
            )
            
            if progress_callback:
                progress_callback(20, "Starting video combination")
            
            # Run FFmpeg command
            await asyncio.to_thread(
                ffmpeg.run,
                stream,
                overwrite_output=True,
                capture_stdout=True,
                capture_stderr=True
            )
            
            if progress_callback:
                progress_callback(90, "Finalizing video")
            
            # Cleanup
            list_path.unlink()
            
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise Exception(f"Failed to combine videos: {str(e)}")
        except Exception as e:
            logger.error(f"Error in combine_videos: {str(e)}")
            raise Exception(f"Failed to combine videos: {str(e)}")

    @staticmethod
    async def add_audio(
        video_path: Path,
        audio_path: Path,
        output_path: Path,
        progress_callback: Optional[callable] = None
    ) -> Path:
        """Add audio to video using FFmpeg"""
        try:
            if progress_callback:
                progress_callback(10, "Starting audio addition")
            
            # Prepare FFmpeg command
            stream = ffmpeg.input(str(video_path))
            audio = ffmpeg.input(str(audio_path))
            stream = ffmpeg.output(
                stream,
                audio,
                str(output_path),
                acodec='aac',
                vcodec='copy',
                loglevel='error'
            )
            
            if progress_callback:
                progress_callback(30, "Processing audio and video")
            
            # Run FFmpeg command
            await asyncio.to_thread(
                ffmpeg.run,
                stream,
                overwrite_output=True,
                capture_stdout=True,
                capture_stderr=True
            )
            
            if progress_callback:
                progress_callback(90, "Finalizing")
            
            return output_path
            
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
            raise Exception(f"Failed to add audio: {str(e)}")
        except Exception as e:
            logger.error(f"Error in add_audio: {str(e)}")
            raise Exception(f"Failed to add audio: {str(e)}")

    @staticmethod
    def get_video_info(video_path: Path) -> dict:
        """Get video metadata using FFmpeg"""
        try:
            probe = ffmpeg.probe(str(video_path))
            video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
            return {
                'duration': float(probe['format']['duration']),
                'width': int(video_info['width']),
                'height': int(video_info['height']),
                'format': probe['format']['format_name']
            }
        except Exception as e:
            logger.error(f"Error getting video info: {str(e)}")
            raise Exception(f"Failed to get video info: {str(e)}") 