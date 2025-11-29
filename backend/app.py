import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Import Routers
from backend.routers import transactions, ai_insights, chat, invoices, accounts, privacy, holistic, voice

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager
from backend.core.database import connect_to_mongo, close_mongo_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan)

# ---------------------------------------------------------
# INCLUDE ROUTERS
# ---------------------------------------------------------
app.include_router(transactions.router)
app.include_router(ai_insights.router)
app.include_router(chat.router)
app.include_router(invoices.router)
app.include_router(accounts.router)
app.include_router(privacy.router)
app.include_router(holistic.router)
app.include_router(voice.router)

# Import and include auth router
from backend.routers import auth
app.include_router(auth.router)


# ---------------------------------------------------------
# CORS Configuration (Allow all for development)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# STATIC FILES
# ---------------------------------------------------------
FRONTEND_DIR = Path("frontend")  # Your frontend folder

if FRONTEND_DIR.exists():
    # Serve the whole frontend folder
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")

    # Serve assets (optional but works for most frontends)
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        logger.info("Mounted /assets")
    else:
        logger.warning("No /assets folder found in frontend.")

else:
    logger.warning("Frontend directory not found. API will work, but UI will be missing.")
    # await close_mongo_connection()


# ---------------------------------------------------------
# FRONTEND ROUTES
# ---------------------------------------------------------
@app.get("/")
async def root_page():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "FinBuddy AI Backend Running"}


@app.get("/dashboard")
async def dashboard_page():
    path = FRONTEND_DIR / "dashboard.html"
    if path.exists():
        return FileResponse(str(path))
    return {"message": "Dashboard not available"}


@app.get("/chat")
async def chat_page():
    path = FRONTEND_DIR / "chat.html"
    if path.exists():
        return FileResponse(str(path))
    return {"message": "Chat not available"}


@app.get("/parser")
async def parser_page():
    path = FRONTEND_DIR / "parser.html"
    if path.exists():
        return FileResponse(str(path))
    return {"message": "Parser not available"}


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0",
        "service": "FinBuddy AI Backend",
    }


# ---------------------------------------------------------
# CATCH-ALL (for any unknown frontend route)
# ---------------------------------------------------------
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Prevent access to missing static assets
    if full_path.startswith(("assets/", "css/", "js/", "static/")):
        raise HTTPException(status_code=404, detail="Static file not found")

    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))

    return {"error": "Page not found"}


# ---------------------------------------------------------
# RUN APP
# ---------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
