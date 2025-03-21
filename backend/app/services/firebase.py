import firebase_admin
from firebase_admin import credentials, storage
from pathlib import Path
import aiohttp
from datetime import timedelta
import json
from ..config import settings
import os

class FirebaseService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        try:
            # Get the credentials file path and make it absolute
            cred_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                settings.FIREBASE_CREDENTIALS_PATH
            )
            
            if not os.path.exists(cred_path):
                raise FileNotFoundError(
                    f"Firebase credentials file not found at {cred_path}. "
                    f"Please place your serviceAccountKey.json file at this location."
                )
            
            # Initialize Firebase with credentials file
            cred = credentials.Certificate(cred_path)
            
            # Remove gs:// prefix if present in the bucket name
            bucket_name = settings.STORAGE_BUCKET
            if bucket_name.startswith('gs://'):
                bucket_name = bucket_name[5:]
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
            self.bucket = storage.bucket()
            self._initialized = True
            print(f"✅ Firebase initialized successfully with bucket: {bucket_name}")
        except Exception as e:
            print(f"❌ Failed to initialize Firebase: {str(e)}")
            raise Exception(f"Failed to initialize Firebase: {str(e)}")

    async def download_video(self, url: str) -> Path:
        """Download video from Firebase URL asynchronously"""
        try:
            # Extract the path from the Firebase Storage URL
            path_start = url.find('/o/') + 3
            path_end = url.find('?')
            if path_start == -1 or path_end == -1:
                raise ValueError("Invalid Firebase Storage URL")
            
            storage_path = url[path_start:path_end].replace('%2F', '/')
            
            # Create a temporary file path
            temp_path = Path(f"{settings.TEMP_DIR}/{Path(storage_path).name}")
            
            # Download using aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        temp_path.parent.mkdir(parents=True, exist_ok=True)
                        with open(temp_path, 'wb') as f:
                            f.write(await response.read())
                        return temp_path
                    raise Exception(f"Failed to download video: {response.status}")
        except Exception as e:
            raise Exception(f"Error downloading video: {str(e)}")

    async def upload_video(self, file_path: Path, destination: str) -> str:
        """Upload processed video to Firebase"""
        try:
            print(f"📤 Starting upload for file: {file_path}")
            print(f"📁 Destination path: {destination}")
            print(f"🪣 Using bucket: {self.bucket.name}")
            
            blob = self.bucket.blob(destination)
            print(f"🔗 Created blob reference: {blob.name}")
            
            print(f"📊 File size: {file_path.stat().st_size / (1024*1024):.2f} MB")
            print("🚀 Starting upload...")
            blob.upload_from_filename(str(file_path))
            print("✅ Upload completed successfully")
            
            print("🔑 Generating signed URL...")
            url = blob.generate_signed_url(timedelta(hours=1))
            print(f"🔗 Generated URL: {url}")
            
            return url
        except Exception as e:
            print(f"❌ Upload failed with error: {str(e)}")
            print(f"❌ Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                print(f"❌ Response status: {e.response.status_code}")
                print(f"❌ Response text: {e.response.text}")
            raise Exception(f"Error uploading video: {str(e)}")

    def cleanup(self, file_path: Path):
        """Clean up temporary files"""
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error cleaning up file {file_path}: {str(e)}") 