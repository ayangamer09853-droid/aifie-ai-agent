"""Deterministic paper-trading domain model for the first Aifie release."""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from uuid import uuid4


@dataclass(frozen=True)
class Signal:
    symbol: str
    direction: str
    confidence: float
    rationale: str
    created_at: str


@dataclass(frozen=True)
class PaperOrder:
    id: str
    symbol: str
    side: str
    quantity: int
    status: str
    created_at: str


class AifieEngine:
    """Keeps simulated order placement behind explicit lightweight risk gates."""

    def __init__(self):
        self.orders: list[PaperOrder] = []

    def research(self, symbol: str) -> Signal:
        normalized = symbol.strip().upper()
        if not normalized or not normalized.replace(".", "").isalnum():
            raise ValueError("symbol must contain letters, numbers, and an optional dot")
        return Signal(
            symbol=normalized,
            direction="watch",
            confidence=0.0,
            rationale="No live data adapter is connected. This is a research placeholder.",
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    def place_paper_order(self, symbol: str, side: str, quantity: int, mode: str) -> PaperOrder:
        if mode != "paper":
            raise ValueError("Aifie only permits paper orders in this release")
        if side not in {"buy", "sell"}:
            raise ValueError("side must be buy or sell")
        if not isinstance(quantity, int) or quantity < 1 or quantity > 1000:
            raise ValueError("quantity must be an integer between 1 and 1000")
        signal = self.research(symbol)
        order = PaperOrder(str(uuid4()), signal.symbol, side, quantity, "simulated", datetime.now(timezone.utc).isoformat())
        self.orders.append(order)
        return order

    def status(self) -> dict:
        return {
            "name": "Aifie AI Agent",
            "mode": "paper",
            "live_execution": False,
            "orders": [asdict(order) for order in self.orders],
        }
