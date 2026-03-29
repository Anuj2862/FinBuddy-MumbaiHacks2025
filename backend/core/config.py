# backend/core/config.py

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Central application configuration.
    Loads from environment variables (.env) and provides
    strongly-typed, structured settings for the entire backend.
    """

    # ---------------------------------------------------------
    # MongoDB Settings
    # ---------------------------------------------------------
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "finbuddy"

    # ---------------------------------------------------------
    # AI Provider Keys (Optional for Demo Mode)
    # ---------------------------------------------------------
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    COHERE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # ---------------------------------------------------------
    # App Meta Settings
    # ---------------------------------------------------------
    GST_THRESHOLD: float = 2000000.0  # 20 Lakhs default
    APP_ENV: str = "development"      # Allowed: development | production | staging
    
    # Authentication Settings
    # ---------------------------------------------------------
    # In production, this MUST be a long, random string from .env
    JWT_SECRET_KEY: str = Field(default="YOUR_SUPER_SECRET_HACKATHON_KEY_2025", env="JWT_SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week for hackathon demo

    # ---------------------------------------------------------
    # Pydantic Settings Configuration
    # ---------------------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # ---------------------------------------------------------
    # Validators
    # ---------------------------------------------------------
    @field_validator("APP_ENV", mode="before")
    def validate_app_env(cls, value: str) -> str:
        allowed = {"development", "production", "staging"}
        if value not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return value

    @field_validator("OPENAI_API_KEY", "GEMINI_API_KEY", "COHERE_API_KEY", "GROQ_API_KEY")
    def validate_non_empty_api_key(cls, value: Optional[str]) -> Optional[str]:
        """
        Ensures that if an API key exists, it cannot be an empty string.
        """
        if value is not None and value.strip() == "":
            return None
        return value


# ---------------------------------------------------------
# Global settings instance
# ---------------------------------------------------------
settings = Settings()
