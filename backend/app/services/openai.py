import openai
import os
import logging
from ..config import settings

logger = logging.getLogger(__name__)

class OpenAIService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OpenAIService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        try:
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key is not configured")
            
            openai.api_key = settings.OPENAI_API_KEY
            self._initialized = True
            logger.info("✅ OpenAI service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI service: {str(e)}")
            raise

    async def generate_script(self, car_details: str, angle_descriptions: list[str]) -> str:
        """Generate a promotional script based on car details and video angles."""
        try:
            logger.info("🤖 Generating script with OpenAI")
            logger.info(f"📝 Car details length: {len(car_details)} characters")
            logger.info(f"🎥 Number of angles: {len(angle_descriptions)}")

            prompt = f"""
            Create a professional 1-minute car promotional script based on the following information:
            
            CAR DETAILS:
            {car_details}
            
            VIDEO ANGLES (in sequence):
            {chr(10).join(f"{i + 1}. {desc}" for i, desc in enumerate(angle_descriptions))}
            
            Instructions:
            Write a plain script without shot, angle, narrator etc.
            Word Limit: Around 100 words
            Tone: Professional, engaging, and impactful
            Structure: Follow the sequence of video angles
            Timing: Each section should fit within approximately 10 seconds of narration
            Content: Highlight key features concisely, making them sound compelling
            Restrictions:
            - No scene directions (e.g., "Fade in," "Shot 1")
            - No speaker labels (e.g., "Narrator:")
            - No additional explanations, only the script itself
            """

            completion = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional automotive copywriter who creates concise, engaging scripts for car promotion videos. Your scripts are known for their powerful, emotional language that connects with viewers while maintaining technical accuracy."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )

            script = completion.choices[0].message.content
            logger.info("✅ Script generated successfully")
            logger.info(f"📊 Script length: {len(script)} characters")
            
            return script
        except Exception as e:
            logger.error(f"❌ Error generating script: {str(e)}")
            raise Exception(f"Failed to generate script: {str(e)}") 