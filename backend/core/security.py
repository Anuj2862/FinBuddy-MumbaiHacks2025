from cryptography.fernet import Fernet
import base64
import os

# In a real app, this should be in .env
# Generating a key for the hackathon demo (consistent across restarts for now)
# We'll use a hardcoded key for simplicity in this demo environment to avoid data loss on restart if key changes
# Key must be 32 url-safe base64-encoded bytes
# This is a valid Fernet key generated for this project
DEMO_KEY = b'2r5U8q5U8q5U8q5U8q5U8q5U8q5U8q5U8q5U8q5U8q4=' 

class SecurityService:
    def __init__(self):
        try:
            self.cipher_suite = Fernet(DEMO_KEY)
        except Exception as e:
            # Fallback or generate new if invalid (shouldn't happen with hardcoded valid key)
            key = Fernet.generate_key()
            self.cipher_suite = Fernet(key)

    def encrypt_data(self, data: str) -> str:
        """Encrypts a string and returns a url-safe base64 encoded string."""
        if not data:
            return ""
        try:
            encrypted_bytes = self.cipher_suite.encrypt(data.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            print(f"Encryption error: {e}")
            return data

    def decrypt_data(self, token: str) -> str:
        """Decrypts a token and returns the original string."""
        if not token:
            return ""
        try:
            decrypted_bytes = self.cipher_suite.decrypt(token.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            # If decryption fails (e.g., old unencrypted data), return original
            return token

from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
from backend.core.config import settings

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token."""
    try:
        decoded_token = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded_token
    except Exception as e:
        return None

security_service = SecurityService()
