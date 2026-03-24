import logging
import os
from fastapi import APIRouter, HTTPException, Query

from ..services.databento_client import DatabentoClient, normalize_instrument

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


def _client() -> DatabentoClient:
    if not os.getenv("DATABENTO_KEY"):
        raise HTTPException(status_code=503, detail="Databento not configured — set DATABENTO_KEY")
    return DatabentoClient()


@router.get("/session-context")
async def session_context(
    instrument: str = Query(..., description="e.g. ES, MES, NQ, MNQ"),
    date: str       = Query(..., description="Session date YYYY-MM-DD"),
):
    """
    Returns daily OHLCV market context for a session date.
    Called by Rails CoachingService before building Claude prompts.
    """
    try:
        ctx = _client().get_session_context(instrument, date)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"session_context error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch market data from Databento")

    if not ctx:
        raise HTTPException(status_code=404, detail=f"No market data for {instrument} on {date}")

    return ctx
