---
name: instant-digital-commerce
description: >-
  Manage the Instant Digital Storefront, generate dynamic one-click UPI QR checkout links,
  and verify cryptographic download tokens for instant digital delivery.
---

# Instant Digital Commerce Skill

This skill teaches the agent how to generate instant UPI QR checkouts and Stripe payment links for digital products, allowing clients to buy and receive files with zero delivery friction.

## Key Operations

1. **List Digital Products**:
   - Query `http://127.0.0.1:8787/api/store/products`

2. **Generate Checkout Session**:
   - Send `POST http://127.0.0.1:8787/api/store/checkout` with:
     ```json
     {
       "productId": "PROMPT_VAULT_500",
       "buyerEmail": "client@example.com"
     }
     ```
   - Returns dynamic `upiIntentUri`, `qrSvg`, and `stripeCheckoutUrl`.

3. **Verify Download Token**:
   - `GET http://127.0.0.1:8787/api/store/download/:token` delivers the code and asset manifest.
