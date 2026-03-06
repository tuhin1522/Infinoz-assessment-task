# Task 1 — n8n Automation Workflow

An AI sales and support chatbot built as a fully automated n8n workflow, backed by Google Gemini 2.5 Flash and Google Sheets as a live database. A Streamlit web UI provides the chat interface.

---

## Architecture Overview



---

## Key Design Choices

**Negotiation:** All price negotiation logic lives inside the AI system prompt. The model is grounded to the service catalogue and cannot offer discounts beyond the defined maximum, eliminating hallucinated pricing without external state tracking.

**Output Parsing:** A JavaScript Code node uses regex to extract labelled machine blocks (`ORDER_CONFIRMED...END_ORDER`, `SESSION_CONFIRMED...END_SESSION`, `ORDER_CANCELLED...END_CANCELLED`) from the raw AI output and separates them from the clean human-facing reply.

**Routing:** The AI outputs two machine-readable tags — `INTENT` (order / booking / cancel / inquiry) and `STATUS` (collecting / negotiating / awaiting_confirm / confirmed / cancelled) — which drive a Switch node to branch the workflow into the correct Google Sheet operation.

**Cancellation:** Decoupled from the AI — uses the user-provided session ID to look up and delete the correct row from the order or booking sheet, then logs to a cancellation sheet.

**Burst Buffer:** A buffer-merge pattern at the webhook entry collapses rapid multi-message bursts from the same session into a single AI call, preventing race conditions and duplicate sheet rows.

---

## Google Sheets Structure

| Sheet | Purpose |
|-------|---------- |
| `order` | Confirmed product orders |
| `booking` | Confirmed discovery call bookings |
| `inquiry` | General product inquiries |
| `temp_conversation` | In-progress conversation turns |
| `Conversations` | Completed conversation logs |
| `Token_Usage` | Per-turn token and cost tracking |

---

## Files

| File | Description |
|------|-------------|
| `n8n-chatbot-final.json` | Importable n8n workflow (production) |
| `n8n_code_nodes.js` | All JavaScript Code node logic |
| `streamlit_app.py` | Streamlit chat UI |
| `dataset.csv` | Product catalogue |
| `explanation.txt` | Design decisions writeup |
| `Screenshots/` | Workflow and sheet screenshots |

---

## Setup

### 1. Import the n8n Workflow

1. Open your n8n instance
2. Go to **Workflows → Import**
3. Import `n8n-chatbot-final.json`
4. Configure credentials: Google Gemini API key, Google Sheets OAuth
5. Activate the workflow

### 2. Run the Streamlit UI

```bash
pip install streamlit requests
streamlit run streamlit_app.py
```

The UI connects to the n8n webhook at `http://localhost:5678`. Update `N8N_BASE_URL` and `WEBHOOK_PATH` in `streamlit_app.py` if your instance is hosted elsewhere.

---

## Chatbot Flows

| Flow | Trigger | Output |
|------|---------|--------|
| Product Inquiry | Any product question | Catalogue-grounded answer |
| Discovery Call | "I want to book a call" | Saved to `booking` sheet |
| Order | "I want to order X" | Saved to `order` sheet |
| Cancellation | "I want to cancel" | Row deleted, logged to cancel sheet |
