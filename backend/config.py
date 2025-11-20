"""
Configuration management for the Ayurvedic Meal Planner API
"""
import os
from typing import Optional
from dotenv import load_dotenv
from loguru import logger

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings with validation"""
    
    def __init__(self):
        # Flask settings
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        self.DEBUG = os.getenv("DEBUG", "True").lower() == "true"
        self.HOST = os.getenv("HOST", "0.0.0.0")
        self.PORT = int(os.getenv("PORT", 5001))
        
        # API Keys
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "firebase_key.json")
        
        # Database settings
        self.GENERATED_PLANS_COL = os.getenv("GENERATED_PLANS_COL", "generated_plans")
        self.DOCTOR_EDITS_COL = os.getenv("DOCTOR_EDITS_COL", "doctor_edits")
        
        # ML Model settings
        self.MODEL_PATH = os.getenv("MODEL_PATH", "models/dosha_model.pkl")
        self.MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0.0")
        
        # Dataset paths
        self.FOOD_DATASET_PATH = os.getenv("FOOD_DATASET_PATH", "data/food_dataset.csv")
        self.DOSHA_DATASET_PATH = os.getenv("DOSHA_DATASET_PATH", "data/dosha_dataset.csv")
        self.PATIENT_DATASET_PATH = os.getenv("PATIENT_DATASET_PATH", "data/patient_dataset.csv")
        self.LIFESTYLE_DATASET_PATH = os.getenv("LIFESTYLE_DATASET_PATH", "data/lifestyle_dataset.csv")
        
        # LLM settings
        self.DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4")
        self.MAX_TOKENS = int(os.getenv("MAX_TOKENS", 2000))
        self.TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))
        self.FOOD_SNIPPET_ROWS = int(os.getenv("FOOD_SNIPPET_ROWS", 60))
        
        # Rate limiting
        self.RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 30))
        self.RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", 500))
        
        # Caching
        self.CACHE_TYPE = os.getenv("CACHE_TYPE", "SimpleCache")
        self.CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", 3600))
        
        # Logging
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.LOG_FORMAT = os.getenv("LOG_FORMAT", "{time} | {level} | {message}")
    
    def validate_openai_key(self):
        """Validate OpenAI API key"""
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        if not self.OPENAI_API_KEY.startswith("sk-"):
            raise ValueError("Invalid OpenAI API key format")
    
    def validate_firebase_path(self):
        """Validate Firebase key path"""
        if not self.FIREBASE_KEY_PATH:
            raise ValueError("FIREBASE_KEY_PATH environment variable is required")
        if not os.path.exists(self.FIREBASE_KEY_PATH):
            raise ValueError(f"Firebase key file not found: {self.FIREBASE_KEY_PATH}")
    
    def validate_all(self):
        """Validate all critical settings"""
        self.validate_openai_key()
        self.validate_firebase_path()


# Global settings instance
settings = Settings()

# Configure logging
logger.remove()
logger.add(
    "logs/app.log",
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT,
    rotation="1 day",
    retention="30 days",
    compression="zip"
)
logger.add(
    lambda msg: print(msg, end=""),
    level=settings.LOG_LEVEL,
    format=settings.LOG_FORMAT
)