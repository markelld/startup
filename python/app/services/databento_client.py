import os
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# CME Globex — covers all CME/CBOT futures (ES, NQ, CL, GC, etc.)
DATASET = "GLBX.MDP3"

# Tradovate/broker base symbol → Databento continuous front-month
SYMBOL_MAP = {
    "ES":  "ES.c.0",
    "MES": "MES.c.0",
    "NQ":  "NQ.c.0",
    "MNQ": "MNQ.c.0",
    "YM":  "YM.c.0",
    "MYM": "MYM.c.0",
    "RTY": "RTY.c.0",
    "M2K": "M2K.c.0",
    "CL":  "CL.c.0",
    "GC":  "GC.c.0",
    "SI":  "SI.c.0",
    "ZB":  "ZB.c.0",
    "ZN":  "ZN.c.0",
    "HE":  "HE.c.0",
    "LE":  "LE.c.0",
}

_MONTH_CODES = set("FGHJKMNQUVXZ")

# In-memory cache — historical data is immutable, safe to cache for the process lifetime
_cache: dict = {}


def normalize_instrument(raw: str) -> str:
    """Strip broker contract suffix: MESH6 → MES, MNQH6 → MNQ, ES → ES"""
    s = raw.upper().strip()
    base = s.rstrip("0123456789")
    if base and base[-1] in _MONTH_CODES:
        base = base[:-1]
    return base if base else s


def get_databento_symbol(instrument: str) -> Optional[str]:
    return SYMBOL_MAP.get(normalize_instrument(instrument))


class DatabentoClient:
    def __init__(self):
        key = os.getenv("DATABENTO_KEY")
        if not key:
            raise RuntimeError("DATABENTO_KEY not configured")
        import databento as db
        self._client = db.Historical(key=key)

    def get_bars(
        self,
        instrument: str,
        start: datetime,
        end: datetime,
        resample: str = "1m",
    ) -> list[dict]:
        """
        Fetch OHLCV bars for a trade window.
        Always fetches 1-minute data from Databento; resamples to 5m/15m if requested.
        """
        symbol = get_databento_symbol(instrument)
        if not symbol:
            raise ValueError(f"No Databento mapping for instrument: {instrument}")

        # Always fetch 1m from Databento; resample client-side for 5m/15m
        cache_key = f"bars:{symbol}:{start.isoformat()}:{end.isoformat()}"
        if cache_key not in _cache:
            data = self._client.timeseries.get_range(
                dataset=DATASET,
                symbols=[symbol],
                schema="ohlcv-1m",
                start=start.strftime("%Y-%m-%dT%H:%M:%S"),
                end=end.strftime("%Y-%m-%dT%H:%M:%S"),
                stype_in="continuous",
            )
            df = data.to_df()
            _cache[cache_key] = df

        df = _cache[cache_key]
        if df.empty:
            return []

        # Resample if needed
        if resample in ("5m", "15m"):
            rule = "5min" if resample == "5m" else "15min"
            df = (
                df.resample(rule)
                .agg({"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
                .dropna()
            )

        bars = []
        for ts, row in df.iterrows():
            bars.append({
                "time":   int(ts.timestamp()),
                "open":   round(float(row["open"]),   4),
                "high":   round(float(row["high"]),   4),
                "low":    round(float(row["low"]),    4),
                "close":  round(float(row["close"]),  4),
                "volume": int(row.get("volume", 0)),
            })
        return bars

    def get_session_context(self, instrument: str, session_date: str) -> dict:
        """
        Fetch a single day's OHLCV for AI coaching context.
        Uses ohlcv-1d schema — cheapest possible Databento query (1 row).
        """
        symbol = get_databento_symbol(instrument)
        if not symbol:
            return {}

        cache_key = f"ctx:{symbol}:{session_date}"
        if cache_key in _cache:
            return _cache[cache_key]

        date = datetime.strptime(session_date, "%Y-%m-%d")
        next_day = date + timedelta(days=1)

        try:
            data = self._client.timeseries.get_range(
                dataset=DATASET,
                symbols=[symbol],
                schema="ohlcv-1d",
                start=date.strftime("%Y-%m-%d"),
                end=next_day.strftime("%Y-%m-%d"),
                stype_in="continuous",
            )
            df = data.to_df()
        except Exception as e:
            logger.error(f"Databento session context fetch error: {e}")
            return {}

        if df.empty:
            return {}

        row = df.iloc[0]
        day_open  = float(row["open"])
        day_high  = float(row["high"])
        day_low   = float(row["low"])
        day_close = float(row["close"])
        day_range = day_high - day_low
        change_pct    = ((day_close - day_open) / day_open * 100) if day_open else 0
        day_range_pct = (day_range / day_open * 100) if day_open else 0

        if change_pct > 0.3:
            direction = "bullish"
        elif change_pct < -0.3:
            direction = "bearish"
        else:
            direction = "mixed/range-bound"

        if day_range_pct > 1.5:
            volatility = "high"
        elif day_range_pct < 0.5:
            volatility = "low"
        else:
            volatility = "normal"

        summary = (
            f"{symbol} on {session_date}: opened {day_open:.2f}, closed {day_close:.2f} "
            f"({change_pct:+.2f}%), day range {day_low:.2f}–{day_high:.2f} "
            f"({day_range_pct:.1f}% range). Market was {direction} with {volatility} volatility."
        )

        ctx = {
            "symbol":     symbol,
            "date":       session_date,
            "open":       round(day_open, 4),
            "high":       round(day_high, 4),
            "low":        round(day_low, 4),
            "close":      round(day_close, 4),
            "change_pct": round(change_pct, 2),
            "range_pct":  round(day_range_pct, 2),
            "direction":  direction,
            "volatility": volatility,
            "summary":    summary,
        }
        _cache[cache_key] = ctx
        return ctx
