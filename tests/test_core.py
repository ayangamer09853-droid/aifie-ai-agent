import unittest

from aifie.core import AifieEngine


class AifieEngineTests(unittest.TestCase):
    def test_research_normalizes_symbol(self):
        signal = AifieEngine().research(" aapl ")
        self.assertEqual(signal.symbol, "AAPL")
        self.assertEqual(signal.direction, "watch")

    def test_only_paper_orders_are_allowed(self):
        engine = AifieEngine()
        with self.assertRaisesRegex(ValueError, "paper orders"):
            engine.place_paper_order("AAPL", "buy", 1, "live")

    def test_paper_order_is_simulated(self):
        order = AifieEngine().place_paper_order("MSFT", "buy", 3, "paper")
        self.assertEqual(order.status, "simulated")


if __name__ == "__main__":
    unittest.main()
