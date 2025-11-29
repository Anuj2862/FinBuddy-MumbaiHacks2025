"""
Authentication router for user registration, login, and OTP verification.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, validator
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


from datetime import datetime
from backend.core.database import mongo
from backend.services.email_service import email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Request/Response Models
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    confirm_password: str
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class LoginRequest(BaseModel):
    username: str
    password: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResendOTPRequest(BaseModel):
    email: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

# Endpoints
@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    try:
        db = mongo.get_db()
        users_collection = db["users"]
        
        # Check if username already exists
        existing_user = await users_collection.find_one({"username": request.username})
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Check if email already exists
        existing_email = await users_collection.find_one({"email": request.email})
        if existing_email is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = pwd_context.hash(request.password)
        
        # Create user document
        user_doc = {
            "username": request.username,
            "email": request.email,
            "password": hashed_password,
            "created_at": datetime.now(),
            "is_verified": False
        }
        
        # Insert user
        result = await users_collection.insert_one(user_doc)
        
        # Send welcome email
        email_service.send_welcome_email(request.email, request.username)
        
        return AuthResponse(
            success=True,
            message="Registration successful! Please login to continue.",
            data={"user_id": str(result.inserted_id)}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user and send OTP."""
    try:
        db = mongo.get_db()
        users_collection = db["users"]
        
        # Find user
        user = await users_collection.find_one({"username": request.username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not pwd_context.verify(request.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Update last login
        await users_collection.update_one(
            {"username": user["username"]},
            {"$set": {"last_login": datetime.now()}}
        )
        
        return AuthResponse(
            success=True,
            message="Login successful!",
            data={
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and complete login."""
    try:
        # Verify OTP
        is_valid, message = email_service.verify_otp(request.email, request.otp)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=message
            )
        
        # Update user verification status
        db = mongo.get_db()
        users_collection = db["users"]
        await users_collection.update_one(
            {"email": request.email},
            {"$set": {"is_verified": True, "last_login": datetime.now()}}
        )
        
        # Get user data
        user = await users_collection.find_one({"email": request.email})
        
        return AuthResponse(
            success=True,
            message="Login successful!",
            data={
                "user_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.post("/resend-otp", response_model=AuthResponse)
async def resend_otp(request: ResendOTPRequest):
    """Resend OTP to user's email."""
    try:
        db = mongo.get_db()
        users_collection = db["users"]
        
        # Find user
        user = await users_collection.find_one({"email": request.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate and send new OTP
        otp = email_service.generate_otp()
        email_service.store_otp(user["email"], otp)
        
        email_sent = email_service.send_otp_email(user["email"], otp, user["username"])
        
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP email"
            )
        
        return AuthResponse(
            success=True,
            message="New OTP sent to your email"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend OTP: {str(e)}"
        )

@router.get("/check-username/{username}")
async def check_username(username: str):
    """Check if username is available."""
    try:
        db = mongo.get_db()
        users_collection = db["users"]
        
        existing_user = await users_collection.find_one({"username": username})
        
        return {
            "available": existing_user is None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
