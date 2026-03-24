from typing import List, Dict, Any
from datetime import datetime
from ..models import TradeInput

LOOKBACK_MINUTES = 5
LOSS_THRESHOLD = 0.0


class RevengeDetector:
    def __init__(self, trades: List[TradeInput]):
        # Sort by entered_at
        self.trades = sorted(
            [t for t in trades if t.entered_at],
            key=lambda t: t.entered_at or ""
        )

    def count(self) -> int:
        return len(self.flags())

    def flags(self) -> List[Dict[str, Any]]:
        revenge_flags = []

        for i, trade in enumerate(self.trades):
            if i == 0:
                continue

            prev = self.trades[i - 1]

            # Previous trade must be a loss
            if prev.net_pnl > LOSS_THRESHOLD:
                continue

            # Check time window
            try:
                prev_time = datetime.fromisoformat(prev.exited_at or prev.entered_at or "")
                curr_time = datetime.fromisoformat(trade.entered_at or "")
                time_diff_minutes = (curr_time - prev_time).total_seconds() / 60.0
            except (ValueError, TypeError):
                continue

            if time_diff_minutes > LOOKBACK_MINUTES:
                continue

            # Must be same or larger size
            if trade.quantity < prev.quantity:
                continue

            revenge_flags.append({
                "trade_id": trade.id,
                "instrument": trade.instrument,
                "entered_at": trade.entered_at,
                "prev_pnl": prev.net_pnl,
                "time_since_loss_minutes": round(time_diff_minutes, 2),
                "quantity": trade.quantity,
                "prev_quantity": prev.quantity,
            })

        return revenge_flags
