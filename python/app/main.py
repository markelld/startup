from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from .routers import analytics, replay, market

app = FastAPI(
    title="Apex Trader Analytics",
    description="ML-powered trading analytics microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("RAILS_API_URL", "http://localhost:3001"),
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(replay.router)
app.include_router(market.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "apex-trader-analytics"}
