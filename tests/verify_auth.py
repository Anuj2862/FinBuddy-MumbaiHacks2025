import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta
from backend.app import app
from backend.core.config import settings
from backend.core.security import create_access_token

# Create a mock for the MongoDB database
mock_db = MagicMock()
mock_users = MagicMock()
mock_users.find_one = AsyncMock()  # This must be an AsyncMock
mock_users.update_one = AsyncMock() # This must be an AsyncMock
mock_db.__getitem__.return_value = mock_users
mock_db.users = mock_users

# Mock the mongo.get_db() method and connect_to_mongo
with patch("backend.core.database.mongo.get_db", return_value=mock_db), \
     patch("backend.app.connect_to_mongo", return_value=AsyncMock()):
    client = TestClient(app)

    def test_unauthorized_access():
        """Test that protected routes return 401 without a token."""
        print("\n--- Testing Unauthorized Access ---")
        response = client.get("/api/accounts/")
        print(f"GET /api/accounts/ (No Token) -> Status: {response.status_code}")
        assert response.status_code == 401
        print("✅ Correctly blocked unauthorized access.")

    def test_invalid_token():
        """Test that invalid tokens return 401."""
        print("\n--- Testing Invalid Token ---")
        response = client.get("/api/accounts/", headers={"Authorization": "Bearer invalidtoken"})
        print(f"GET /api/accounts/ (Invalid Token) -> Status: {response.status_code}")
        assert response.status_code == 401
        print("✅ Correctly blocked invalid token.")

    def test_authorized_access():
        """Test that valid tokens allow access."""
        print("\n--- Testing Authorized Access ---")
        
        # 1. Create a dummy token for a test user
        test_email = "test@example.com"
        access_token = create_access_token(data={"sub": test_email})
        
        # 2. Mock the user lookup in MongoDB
        # get_current_user calls db.users.find_one({"email": email})
        mock_users.find_one = AsyncMock(return_value={
            "email": test_email,
            "full_name": "Test User",
            "is_active": True
        })
        
        # 3. Access protected route
        response = client.get("/api/accounts/", headers={"Authorization": f"Bearer {access_token}"})
        print(f"GET /api/accounts/ (Valid Token) -> Status: {response.status_code}")
        
        # Note: Depending on whether AccountService is also mocked, this might return 500 or 200.
        # But we mostly care that it passed the `get_current_user` dependency check.
        # If it's not 401, it means auth passed.
        assert response.status_code != 401
        print(f"✅ Access granted (passed auth dependency). Status: {response.status_code}")

    def test_auth_flow():
        """Test register and login endpoints."""
        print("\n--- Testing Auth Flow (Login) ---")
        
        test_email = "test@example.com"
        
        # Mock the find_one to return a user with a specific hash and _id
        mock_users.find_one = AsyncMock(return_value={
            "_id": "fake_user_id",
            "username": "testuser",
            "email": test_email,
            "password": "fake_hashed_password",
            "is_active": True
        })
        
        # Patch pwd_context.verify in backend.routers.auth
        with patch("backend.routers.auth.pwd_context.verify", return_value=True), \
             patch("backend.routers.auth.mongo.get_db", return_value=mock_db):
            # Test Login
            login_data = {"username": "testuser", "password": "password123"}
            response = client.post("/api/auth/login", json=login_data)
            print(f"POST /api/auth/login -> Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error: {response.json()}")
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            print("✅ Login successful, token received.")

    def test_registration():
        """Test registration endpoint."""
        print("\n--- Testing Registration ---")
        
        test_email = "newuser@example.com"
        test_username = "newuser123"
        
        # Mock find_one to return None (user doesn't exist)
        mock_users.find_one = AsyncMock(return_value=None)
        # Mock insert_one
        mock_users.insert_one = AsyncMock(return_value=MagicMock(inserted_id="fake_id"))
        
        reg_data = {
            "email": test_email,
            "username": test_username,
            "password": "password123",
            "confirm_password": "password123"
        }
        
        # Patch get_password_hash in backend.routers.auth
        with patch("backend.routers.auth.get_password_hash", return_value="hashed_password"):
            response = client.post("/api/auth/register", json=reg_data)
            print(f"POST /api/auth/register -> Status: {response.status_code}")
            assert response.status_code == 200
            print("✅ Registration successful.")

    if __name__ == "__main__":
        try:
            test_unauthorized_access()
            test_invalid_token()
            test_authorized_access()
            test_registration()
            test_auth_flow()
            print("\n🚀 ALL AUTH VERIFICATION TESTS PASSED! 🚀")
        except Exception as e:
            print(f"\n❌ Test Failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
