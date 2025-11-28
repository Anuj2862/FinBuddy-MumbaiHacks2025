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

security_service = SecurityService()
