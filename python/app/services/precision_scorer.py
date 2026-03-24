from typing import List
from ..models import TradeInput


class PrecisionScorer:
    def __init__(self, trades: List[TradeInput]):
        self.trades = [t for t in trades if t.exit_price and t.entry_price]

    def entry_precision(self) -> float:
        """
        Reward-to-risk ratio scaled 0-100.
        Uses r_multiple if available, else calculates from prices.
        """
        if not self.trades:
            return 50.0

        r_multiples = []
        for trade in self.trades:
            if trade.r_multiple is not None:
                r_multiples.append(trade.r_multiple)
            elif trade.stop_loss:
                risk = abs(trade.entry_price - trade.stop_loss)
                if risk > 0:
                    reward = abs(trade.exit_price - trade.entry_price)
                    r_multiples.append(reward / risk)

        if not r_multiples:
            return 50.0

        avg_r = sum(r_multiples) / len(r_multiples)
        # Scale: 0R = 0, 1R = 50, 2R = 75, 3R+ = 100
        score = min(100.0, max(0.0, (avg_r / 3.0) * 100))
        return round(score, 2)

    def trade_management_score(self) -> float:
        """
        % of trades that reached at least 1R before exit.
        """
        if not self.trades:
            return 50.0

        reached_1r = 0
        eligible = 0

        for trade in self.trades:
            if trade.r_multiple is None or trade.stop_loss is None:
                continue
            eligible += 1
            if trade.r_multiple >= 1.0:
                reached_1r += 1

        if eligible == 0:
            return 50.0

        return round((reached_1r / eligible) * 100, 2)

    def early_exit_rate(self) -> float:
        """
        % of winning trades closed before reaching 1R.
        Higher = bad (leaving money on table).
        """
        if not self.trades:
            return 0.0

        winners = [t for t in self.trades if t.net_pnl > 0]
        if not winners:
            return 0.0

        early_exits = sum(
            1 for t in winners
            if t.r_multiple is not None and t.r_multiple < 1.0
        )

        eligible = sum(1 for t in winners if t.r_multiple is not None)
        if eligible == 0:
            return 0.0

        return round((early_exits / eligible) * 100, 2)
