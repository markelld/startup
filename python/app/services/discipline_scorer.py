from typing import List, Optional
from ..models import TradeInput, AccountRules

STOP_BUFFER_PCT = 0.10  # 10% buffer on stop discipline check


class DisciplineScorer:
    def __init__(self, trades: List[TradeInput], rules: Optional[AccountRules] = None):
        self.trades = trades
        self.rules = rules or AccountRules()

    def stop_discipline(self) -> float:
        """
        Checks if exit_price respects the stop loss (within 10% buffer).
        Returns 0-100. Returns 50 if no stop data available.
        """
        eligible = [t for t in self.trades if t.stop_loss and t.exit_price and t.entry_price]

        if not eligible:
            return 50.0

        respected = 0
        for trade in eligible:
            risk = abs(trade.entry_price - trade.stop_loss)
            buffer = risk * STOP_BUFFER_PCT

            if trade.side == "long":
                # For longs, exit should not be much below stop
                violated = trade.exit_price < (trade.stop_loss - buffer)
            else:
                # For shorts, exit should not be much above stop
                violated = trade.exit_price > (trade.stop_loss + buffer)

            if not violated:
                respected += 1

        return round((respected / len(eligible)) * 100, 2)

    def composite_discipline_score(self) -> float:
        """
        Overall discipline score combining stop discipline + rule compliance penalties.
        """
        base_score = self.stop_discipline()
        penalty = self._calculate_violation_penalties()
        return max(0.0, min(100.0, round(base_score - penalty, 2)))

    def _calculate_violation_penalties(self) -> float:
        """
        Calculate penalty points based on trading behavior vs rules.
        """
        penalty = 0.0
        closed_trades = [t for t in self.trades if t.exit_price]

        # Penalty for overtrading
        max_trades = self.rules.max_trades_per_session or 10
        if len(closed_trades) > max_trades:
            overage = len(closed_trades) - max_trades
            penalty += min(20.0, overage * 3.0)

        # Penalty for oversizing
        max_contracts = self.rules.max_contracts or 5
        oversized = sum(1 for t in closed_trades if t.quantity > max_contracts)
        penalty += min(15.0, oversized * 3.0)

        return penalty
