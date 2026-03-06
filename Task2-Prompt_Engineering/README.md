# Task 2 — Prompt Engineering

A Python terminal chatbot powered by Google Gemini 2.5 Flash. All intelligence — including multi-turn conversation, price negotiation, order confirmation, and cancellation — is driven purely through prompt engineering with no external state management.

---

## How It Works

The script loads a product catalogue from `dataset.csv`, injects it into a structured system prompt, and opens a multi-turn Gemini chat session. The prompt defines the AI persona (Aria), strict behavioural rules, and four explicit conversation flows with gated confirmation steps.

---

## Prompt Design (v2)

The system prompt (`prompt.py`) is structured into five sections:

| Section | Purpose |
|---------|---------|
| Role & Persona | Defines "Aria" — warm, professional, grounded |
| Strict Behavioural Rules | 7 rules covering brevity, grounding, no assumptions, language matching |
| Flow 1 — Product Inquiries | Catalogue-only answers with call-to-action |
| Flow 2 — Discovery Call Booking | 3-step: collect → confirm → output |
| Flow 3 — Order Placement & Negotiation | 4-step: collect → negotiate → summarise → confirm |
| Flow 4 — Order Cancellation | 3-step: collect phone → confirm → output |
| Edge Cases | Frustrated users, out-of-scope questions, incomplete details |

### Key Prompt Rules

- **No premature output:** Structured confirmation blocks are never output until the user explicitly says "Yes", "Confirm", "Sure", or similar
- **Negotiation grounding:** Discounts are offered only if they appear in the catalogue; the model cannot invent or exceed catalogue limits
- **No assumptions:** The model never pre-fills any field the user has not explicitly stated
- **One topic at a time:** Mid-flow questions are deferred until the current step is complete

---

## Prompt Versions

| File | Description |
|------|-------------|
| `prompt-v1.txt` | Initial prompt — basic flows, minimal guardrails |
| `prompt-v2.txt` | Production prompt — full persona, 7 behavioural rules, 4 gated flows, edge cases |
| `changes(v1-v2).txt` | 5-sentence summary of every change and the reasoning behind it |

---

## Files

| File | Description |
|------|-------------|
| `chatbot.py` | Main script — loads catalogue, starts Gemini chat loop |
| `prompt.py` | System prompt template (v2, production) |
| `dataset.csv` | Product catalogue (10 products with prices, timelines, discount rules) |
| `.env` | API key storage (not committed to git) |
| `Conversations/` | Screenshots of test conversation flows |

---

## Setup

### 1. Install dependencies

```bash
pip install google-genai python-dotenv
```

### 2. Add your API key

Create a `.env` file in this folder:

```
GOOGLE_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

### 3. Run the chatbot

```bash
python3 chatbot.py
```

Type your message and press Enter. Type `quit` or `exit` to stop.

---

## Example Conversations

| Flow | User says | Bot does |
|------|-----------|----------|
| Inquiry | "Tell me about Samsung Galaxy Phone" | Describes product from catalogue, asks if they want to order |
| Booking | "I want to book a discovery call" | Asks for Name, Email, Date, Time, Platform in one message |
| Order | "I want to order a Smart Watch" | Collects details, shows $120 price, negotiates to $110 (8% first-time), confirms |
| Negotiation | "That's too expensive" | Offers catalogue-allowed discount only, never goes lower |
| Cancellation | "I want to cancel my order" | Asks for phone number, shows summary, cancels on confirm |

---
