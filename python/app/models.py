from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class TradeInput(BaseModel):
    id: str
    instrument: str
    side: str  # long / short
    quantity: int
    entry_price: float
    exit_price: float
    stop_loss: Optional[float] = None
    net_pnl: float
    entered_at: Optional[str] = None
    exited_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    r_multiple: Optional[float] = None


class AccountRules(BaseModel):
    daily_loss_limit: Optional[float] = -2000.0
    max_contracts: Optional[int] = 5
    max_trades_per_session: Optional[int] = 10
    max_consecutive_losses: Optional[int] = 3


class SessionInput(BaseModel):
    session_id: str
    account_id: str
    rules: AccountRules = AccountRules()
    trades: List[TradeInput]


class SessionAnalyticsResponse(BaseModel):
    discipline_score: float
    entry_precision: float
    stop_discipline: float
    trade_management: float
    early_exit_rate: float
    revenge_trade_count: int
    behavioral_flags: List[str]
    time_of_day_breakdown: Dict[str, Any]
    r_distribution: List[float]


class TradeGradeInput(BaseModel):
    trade_id: str
    instrument: str
    side: str
    entry_price: float
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    quantity: int
    net_pnl: float
    r_multiple: Optional[float] = None
    duration_minutes: Optional[int] = None


class TradeGradeResponse(BaseModel):
    grade: str  # A, B, C, F
    setup_score: float
    entry_score: float
    risk_score: float
    mgmt_score: float
    composite_score: float
    coaching_notes: str


class BehavioralResponse(BaseModel):
    revenge_trade_rate: float
    overtrading_sessions: int
    best_time_window: str
    worst_time_window: str
    losing_streak_behavior: str
    top_flags: List[str]
    trend_30d: Dict[str, Any]
