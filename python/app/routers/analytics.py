from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import datetime
import os
import httpx

from ..models import (
    SessionInput, SessionAnalyticsResponse,
    TradeGradeInput, TradeGradeResponse,
    BehavioralResponse
)
from ..services.revenge_detector import RevengeDetector
from ..services.precision_scorer import PrecisionScorer
from ..services.discipline_scorer import DisciplineScorer

router = APIRouter(prefix="/analytics", tags=["analytics"])

INTERNAL_TOKEN = os.getenv("INTERNAL_API_TOKEN", "dev_token")
RAILS_API_URL = os.getenv("RAILS_API_URL", "http://localhost:3001")


def verify_internal_token(x_internal_token: Optional[str] = Header(None)):
    if x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@router.post("/session", response_model=SessionAnalyticsResponse)
async def analyze_session(
    body: SessionInput,
    x_internal_token: Optional[str] = Header(None)
):
    verify_internal_token(x_internal_token)

    trades = body.trades
    closed_trades = [t for t in trades if t.exit_price is not None]

    revenge_detector = RevengeDetector(closed_trades)
    precision_scorer = PrecisionScorer(closed_trades)
    discipline_scorer = DisciplineScorer(trades, body.rules)

    revenge_flags = revenge_detector.flags()
    revenge_trade_count = len(revenge_flags)

    behavioral_flags = []
    if revenge_trade_count > 0:
        behavioral_flags.append(f"REVENGE_TRADING: {revenge_trade_count} detected")
    if len(closed_trades) > (body.rules.max_trades_per_session or 10):
        behavioral_flags.append("OVERTRADING: exceeded session limit")

    # Time of day P&L breakdown
    time_breakdown = _time_of_day_pnl(closed_trades)

    # R distribution
    r_distribution = [
        t.r_multiple for t in closed_trades
        if t.r_multiple is not None
    ]

    discipline_score = discipline_scorer.composite_discipline_score()

    return SessionAnalyticsResponse(
        discipline_score=discipline_score,
        entry_precision=precision_scorer.entry_precision(),
        stop_discipline=discipline_scorer.stop_discipline(),
        trade_management=precision_scorer.trade_management_score(),
        early_exit_rate=precision_scorer.early_exit_rate(),
        revenge_trade_count=revenge_trade_count,
        behavioral_flags=behavioral_flags,
        time_of_day_breakdown=time_breakdown,
        r_distribution=r_distribution,
    )


@router.post("/grade_trade", response_model=TradeGradeResponse)
async def grade_trade(
    body: TradeGradeInput,
    x_internal_token: Optional[str] = Header(None)
):
    verify_internal_token(x_internal_token)

    # Setup score: based on r_multiple
    r = body.r_multiple or 0.0
    setup_score = min(100.0, max(0.0, (r / 3.0) * 100))

    # Entry score: pnl / risk ratio
    if body.stop_loss:
        risk = abs(body.entry_price - body.stop_loss) * body.quantity
        entry_score = min(100.0, max(0.0, (body.net_pnl / risk * 50 + 50))) if risk > 0 else 50.0
    else:
        entry_score = 50.0

    # Risk score: was a stop loss set?
    risk_score = 80.0 if body.stop_loss else 20.0

    # Management score: how much of the target distance did you capture?
    if body.target_price and body.exit_price and body.entry_price:
        target_dist = abs(body.target_price - body.entry_price)
        exit_dist = abs(body.exit_price - body.entry_price)
        mgmt_score = min(100.0, max(0.0, (exit_dist / target_dist) * 100)) if target_dist > 0 else 50.0
    elif body.duration_minutes and body.net_pnl > 0:
        mgmt_score = min(100.0, 50.0 + (body.duration_minutes / 120.0) * 50)
    elif body.duration_minutes and body.net_pnl < 0:
        mgmt_score = max(0.0, 100.0 - (body.duration_minutes / 30.0) * 50)
    else:
        mgmt_score = 50.0

    composite = (setup_score + entry_score + risk_score + mgmt_score) / 4.0

    if composite >= 85:
        grade = "A"
    elif composite >= 70:
        grade = "B"
    elif composite >= 50:
        grade = "C"
    else:
        grade = "F"

    coaching_notes = _generate_coaching_notes(body, grade, setup_score, entry_score, risk_score, mgmt_score)

    return TradeGradeResponse(
        grade=grade,
        setup_score=round(setup_score, 2),
        entry_score=round(entry_score, 2),
        risk_score=round(risk_score, 2),
        mgmt_score=round(mgmt_score, 2),
        composite_score=round(composite, 2),
        coaching_notes=coaching_notes,
    )


@router.get("/behavioral/{account_id}", response_model=BehavioralResponse)
async def behavioral_analysis(
    account_id: str,
    lookback_days: int = 30,
    x_internal_token: Optional[str] = Header(None)
):
    verify_internal_token(x_internal_token)

    # Fetch sessions from Rails internal API
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{RAILS_API_URL}/internal/accounts/{account_id}/sessions",
                params={"lookback_days": lookback_days},
                headers={"X-Internal-Token": INTERNAL_TOKEN},
                timeout=10.0
            )
            sessions = resp.json() if resp.status_code == 200 else []
        except Exception:
            sessions = []

    all_trades = [t for s in sessions for t in s.get("trades", [])]

    if not all_trades:
        return BehavioralResponse(
            revenge_trade_rate=0.0,
            overtrading_sessions=0,
            best_time_window="N/A",
            worst_time_window="N/A",
            losing_streak_behavior="insufficient_data",
            top_flags=[],
            trend_30d={}
        )

    # Compute behavioral metrics
    total_trades = len(all_trades)
    revenge_count = sum(1 for t in all_trades if t.get("is_revenge_trade"))
    revenge_rate = round(revenge_count / total_trades * 100, 2) if total_trades > 0 else 0.0

    overtrading_count = sum(
        1 for s in sessions
        if len(s.get("trades", [])) > 10
    )

    time_breakdown = _time_of_day_pnl_from_dicts(all_trades)
    best_window = max(time_breakdown, key=lambda k: time_breakdown[k], default="N/A")
    worst_window = min(time_breakdown, key=lambda k: time_breakdown[k], default="N/A")

    top_flags = []
    if revenge_rate > 20:
        top_flags.append("HIGH_REVENGE_TRADING")
    if overtrading_count > len(sessions) * 0.3:
        top_flags.append("FREQUENT_OVERTRADING")

    trend_30d = {
        "sessions": len(sessions),
        "total_pnl": sum(s.get("net_pnl", 0) for s in sessions),
        "revenge_rate": revenge_rate,
    }

    return BehavioralResponse(
        revenge_trade_rate=revenge_rate,
        overtrading_sessions=overtrading_count,
        best_time_window=best_window,
        worst_time_window=worst_window,
        losing_streak_behavior="improves_after_break" if revenge_rate < 15 else "continues_revenge_trading",
        top_flags=top_flags,
        trend_30d=trend_30d,
    )


def _time_of_day_pnl(trades) -> dict:
    buckets = {"morning": 0.0, "midday": 0.0, "afternoon": 0.0}
    for trade in trades:
        if not trade.entered_at:
            continue
        try:
            hour = datetime.fromisoformat(trade.entered_at).hour
            if hour < 11:
                buckets["morning"] += trade.net_pnl
            elif hour < 14:
                buckets["midday"] += trade.net_pnl
            else:
                buckets["afternoon"] += trade.net_pnl
        except (ValueError, TypeError):
            continue
    return {k: round(v, 2) for k, v in buckets.items()}


def _time_of_day_pnl_from_dicts(trades) -> dict:
    buckets = {"morning": 0.0, "midday": 0.0, "afternoon": 0.0}
    for trade in trades:
        entered_at = trade.get("entered_at")
        if not entered_at:
            continue
        try:
            hour = datetime.fromisoformat(str(entered_at)).hour
            pnl = float(trade.get("net_pnl", 0))
            if hour < 11:
                buckets["morning"] += pnl
            elif hour < 14:
                buckets["midday"] += pnl
            else:
                buckets["afternoon"] += pnl
        except (ValueError, TypeError):
            continue
    return {k: round(v, 2) for k, v in buckets.items()}


def _generate_coaching_notes(trade, grade, setup, entry, risk, mgmt) -> str:
    notes = []

    if not trade.stop_loss:
        notes.append("Always define a stop loss before entering a trade.")
    if risk < 50:
        notes.append("Risk management needs improvement — ensure stop loss is properly placed.")
    if setup < 50:
        notes.append("Look for higher R-multiple setups (minimum 1:1.5 reward-to-risk).")
    if mgmt < 50:
        notes.append("Work on trade management — cut losses faster and let winners run.")
    if grade == "A":
        notes.append("Excellent trade execution. Replicate this setup process.")
    elif grade == "F":
        notes.append("Review what went wrong and identify the key mistake to avoid repeating.")

    return " ".join(notes) if notes else "Good discipline on this trade."
