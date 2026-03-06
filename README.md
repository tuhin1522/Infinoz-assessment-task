# Infinoz Assessment — AI Sales & Support Chatbot

This repository contains two independent implementations of an AI-powered sales and support chatbot, completed as part of the Infinoz technical assessment.

---

## Project Structure

```
Infinoz-assessment-task/
├── Task1-n8n_Automation_Workflow/   # n8n workflow + Streamlit UI
└── Task2-Prompt_Engineering/        # Pure Python terminal chatbot
```

---

## Task Overview

| Task | Approach | Model | Interface |
|------|----------|-------|-----------|
| Task 1 | n8n automation workflow | Google Gemini 2.5 Flash | Streamlit web UI |
| Task 2 | Python script with prompt engineering | Google Gemini 2.5 Flash | Terminal |

---

## Shared Capabilities

Both implementations support the same core chatbot flows:

- **Product Inquiries** — answers questions using only the provided product catalogue
- **Discovery Call Booking** — collects name, email, date, time, and platform, then confirms
- **Order Placement & Negotiation** — collects order details, handles price negotiation using catalogue discount rules, and saves confirmed orders
- **Order Cancellation** — verifies by phone number / session ID and confirms before cancelling

---

## Requirements

- Python 3.10+
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/app/apikey))
- n8n (Task 1 only)
- Streamlit (Task 1 only)

---

## Author

Md Tuhin Molla — Infinoz Technical Assessment, March 2026
