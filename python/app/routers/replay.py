import logging
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query

from ..services.databento_client import (
    DatabentoClient,
    normalize_instrument,
    SYMBOL_MAP,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/replay", tags=["replay"])

# yfinance fallback symbol map (used when DATABENTO_KEY not set)
_YF_SYMBOL_MAP = {
    "MNQ": "MNQ=F", "NQ":  "NQ=F",  "MES": "MES=F", "ES":  "ES=F",
    "CL":  "CL=F",  "GC":  "GC=F",  "SI":  "SI=F",  "ZB":  "ZB=F",
    "ZN":  "ZN=F",  "RTY": "RTY=F", "M2K": "M2K=F", "YM":  "YM=F",
    "MYM": "MYM=F", "HE":  "HE=F",  "LE":  "LE=F",
}

_VALID_INTERVALS = {"1m", "5m", "15m"}


@router.get("/bars/{instrument}")
async def get_replay_bars(
    instrument: str,
    from_ts:  int = Query(..., description="Trade entry unix timestamp (seconds)"),
    to_ts:    int = Query(..., description="Trade exit unix timestamp (seconds)"),
    interval: str = Query("1m", description="Candle interval: 1m, 5m, 15m"),
):
    if interval not in _VALID_INTERVALS:
        interval = "1m"

    from_dt = datetime.fromtimestamp(from_ts)
    to_dt   = datetime.fromtimestamp(to_ts)

    # Buffer: 3 bars before entry, 2 bars after exit
    bar_minutes   = {"1m": 1, "5m": 5, "15m": 15}[interval]
    window_start  = from_dt - timedelta(minutes=bar_minutes * 3)
    window_end    = to_dt   + timedelta(minutes=bar_minutes * 2)

    # --- Databento (preferred) ---
    if os.getenv("DATABENTO_KEY"):
        try:
            bars = DatabentoClient().get_bars(instrument, window_start, window_end, resample=interval)
            if bars:
                return {
                    "bars":     bars,
                    "interval": interval,
                    "symbol":   normalize_instrument(instrument),
                    "source":   "databento",
                    "entry_ts": from_ts,
                    "exit_ts":  to_ts,
                }
            logger.warning(f"Databento returned no bars for {instrument}, falling back to yfinance")
        except Exception as e:
            logger.warning(f"Databento error for {instrument}: {e} — falling back to yfinance")

    # --- yfinance fallback ---
    base   = normalize_instrument(instrument)
    symbol = _YF_SYMBOL_MAP.get(base)
    if not symbol:
        raise HTTPException(status_code=404, detail=f"Unknown instrument: {instrument}")

    try:
        import yfinance as yf
    except ImportError:
        raise HTTPException(status_code=500, detail="yfinance not installed and Databento not configured")

    yf_interval_max_days = {"1m": 7, "5m": 60, "15m": 60}
    days_ago = (datetime.now() - from_dt).days
    if days_ago > yf_interval_max_days[interval]:
        # Fall back to coarser resolution
        if days_ago <= 60:
            interval = "5m"
        else:
            interval = "15m"

    fetch_start = window_start.strftime("%Y-%m-%d")
    fetch_end   = (window_end + timedelta(days=1)).strftime("%Y-%m-%d")

    ticker = yf.Ticker(symbol)
    df = ticker.history(start=fetch_start, end=fetch_end, interval=interval)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No price data available for {symbol}")

    w_start_ts = window_start.timestamp()
    w_end_ts   = window_end.timestamp()
    df = df[[w_start_ts <= ts.timestamp() <= w_end_ts for ts in df.index]]

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No bars in trade window for {symbol}")

    bars = [
        {
            "time":  int(ts.timestamp()),
            "open":  round(float(row["Open"]),  4),
            "high":  round(float(row["High"]),  4),
            "low":   round(float(row["Low"]),   4),
            "close": round(float(row["Close"]), 4),
        }
        for ts, row in df.iterrows()
    ]

    return {
        "bars":     bars,
        "interval": interval,
        "symbol":   symbol,
        "source":   "yfinance",
        "entry_ts": from_ts,
        "exit_ts":  to_ts,
    }
