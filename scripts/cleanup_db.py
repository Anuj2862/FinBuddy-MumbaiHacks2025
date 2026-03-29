import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup():
    print("🧹 Starting Database Cleanup...")
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "finbuddy")
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    
    # 1. Transactions with no user_id (Legacy)
    res = await db["transactions"].delete_many({"user_id": {"$exists": False}})
    print(f"🗑️ Deleted {res.deleted_count} legacy transactions (missing user_id)")
    
    # 2. Reset AI Memory for all users (optional, but cleaner)
    # We don't delete the collection, just notify that memory store is transient in this version
    
    # 3. List current users
    users = await db["users"].find().to_list(100)
    print(f"👤 Current registered users: {[u['username'] for u in users]}")
    
    print("\n✅ Database is now sanitized for multi-user testing.")
    print("💡 Tip: You can now create two different accounts to verify that data is strictly isolated!")

if __name__ == "__main__":
    asyncio.run(cleanup())
