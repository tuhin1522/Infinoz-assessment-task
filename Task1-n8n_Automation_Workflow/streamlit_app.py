"""
Streamlit Chat UI — connects to the n8n webhook chatbot.
Run: streamlit run streamlit_app.py
"""

import streamlit as st
import requests
import uuid
import json
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
N8N_BASE_URL     = "http://localhost:5678"
WEBHOOK_PATH     = "902a2061-a8f8-4ffe-a674-09f99dbca86f"
PAGE_TITLE       = "AI Sales & Support Chatbot"
BOT_AVATAR       = "🤖"
USER_AVATAR       = "🧑"

# ── Page setup ────────────────────────────────────────────────────────────────
st.set_page_config(page_title=PAGE_TITLE, page_icon="🤖", layout="centered")

st.title("🤖 AI Sales & Support Chatbot")
st.caption("Powered by n8n + Google Gemini")

# ── Session state init ────────────────────────────────────────────────────────
if "session_id" not in st.session_state:
    st.session_state.session_id = "user_" + str(uuid.uuid4())[:8]

if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": "Hi! I'm your sales and support assistant. How can I help you today?",
            "meta": None,
        }
    ]

if "last_status" not in st.session_state:
    st.session_state.last_status = "none"

if "n8n_mode" not in st.session_state:
    st.session_state.n8n_mode = "Production"

# ── Sidebar: session info ─────────────────────────────────────────────────────
with st.sidebar:
    st.header("Session Info")
    st.code(st.session_state.session_id, language=None)
    st.caption(f"Messages: {len(st.session_state.messages)}")
    st.caption(f"Status: {st.session_state.last_status}")

    if st.button("🗑️ Clear Chat"):
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": "Hi! I'm your sales and support assistant. How can I help you today?",
                "meta": None,
            }
        ]
        st.session_state.session_id = "user_" + str(uuid.uuid4())[:8]
        st.session_state.last_status = "none"
        st.rerun()

    st.divider()
    st.subheader("n8n Connection")

    mode = st.radio(
        "Webhook Mode",
        options=["Production", "Test"],
        index=0 if st.session_state.n8n_mode == "Production" else 1,
        horizontal=True,
        help="Production: workflow must be Active in n8n.  Test: use while manually executing in n8n editor.",
    )
    st.session_state.n8n_mode = mode

    base_url = st.text_input("n8n Base URL", value=N8N_BASE_URL)
    path_mode = "webhook" if mode == "Production" else "webhook-test"
    webhook_url = f"{base_url.rstrip('/')}/{path_mode}/{WEBHOOK_PATH}"

    st.caption(f"🔗 `{webhook_url}`")
    if mode == "Production":
        st.info("⚡ Make sure the workflow is **Active** in n8n (toggle in top-right of workflow editor).")
    else:
        st.warning("🧪 Test mode — click **Execute Workflow** in n8n editor first.")

# ── Render chat history ───────────────────────────────────────────────────────
for msg in st.session_state.messages:
    avatar = BOT_AVATAR if msg["role"] == "assistant" else USER_AVATAR
    with st.chat_message(msg["role"], avatar=avatar):
        st.write(msg["content"])

        # Show structured data if confirmed
        if msg.get("meta"):
            meta = msg["meta"]
            intent = meta.get("intent", "")
            status = meta.get("status", "")

            if status == "confirmed" and meta.get("order_confirmed"):
                oc = meta["order_confirmed"]
                with st.expander("✅ Order Confirmed", expanded=True):
                    st.markdown(f"**Session ID:** `{meta.get('session_id', '')}`")
                    st.markdown(f"**Product Name:** {oc.get('product', oc.get('product_name', ''))}")
                    st.markdown(f"**Customer Name:** {oc.get('name', oc.get('customer_name', ''))}")
                    st.markdown(f"**Phone:** {oc.get('phone', '')}")
                    st.markdown(f"**Quantity:** {oc.get('quantity', '')}")
                    st.markdown(f"**Price:** {oc.get('price', oc.get('final_price', ''))}")
                    st.markdown(f"**Delivery Address:** {oc.get('delivery_address', '')}")

            elif status == "confirmed" and meta.get("session_confirmed"):
                sc = meta["session_confirmed"]
                with st.expander("📅 Discovery Call Booked", expanded=True):
                    st.markdown(f"**Session ID:** `{meta.get('session_id', '')}`")
                    st.markdown(f"**Name:** {sc.get('name', '')}")
                    st.markdown(f"**Email:** {sc.get('email', '')}")
                    st.markdown(f"**Date:** {sc.get('date', '')}")
                    st.markdown(f"**Time:** {sc.get('time', '')}")
                    st.markdown(f"**Platform:** {sc.get('platform', '')}")

            elif status == "cancelled" and meta.get("order_cancelled"):
                oc = meta["order_cancelled"]
                with st.expander("❌ Order Cancelled", expanded=True):
                    st.markdown(f"**Session ID:** `{meta.get('session_id', oc.get('session_id', ''))}`")
                    if oc.get('product_name'):
                        st.markdown(f"**Product:** {oc.get('product_name')}")
                    if oc.get('reason'):
                        st.markdown(f"**Reason:** {oc.get('reason')}")

            elif status == "cancelled" and meta.get("booking_cancelled"):
                bc = meta["booking_cancelled"]
                with st.expander("❌ Booking Cancelled", expanded=True):
                    st.markdown(f"**Session ID:** `{meta.get('session_id', bc.get('session_id', ''))}`")
                    if bc.get('reason'):
                        st.markdown(f"**Reason:** {bc.get('reason')}")

            elif status == "not_found":
                st.warning(f"⚠️ No order or booking was found with the provided session ID.")

            # Status badge
            badge_color = {
                "confirmed":  "green",
                "cancelled":  "red",
                "not_found":  "red",
                "collecting": "orange",
                "negotiating": "orange",
                "awaiting_confirmation": "blue",
            }.get(status, "gray")

            st.markdown(
                f"<span style='font-size:0.75rem; color:{badge_color}; "
                f"border:1px solid {badge_color}; border-radius:4px; "
                f"padding:1px 6px;'>🏷 {intent} · {status}</span>",
                unsafe_allow_html=True,
            )

# ── Chat input ────────────────────────────────────────────────────────────────
user_input = st.chat_input("Type your message…")

if user_input:
    # Append user message
    st.session_state.messages.append({"role": "user", "content": user_input, "meta": None})
    with st.chat_message("user", avatar=USER_AVATAR):
        st.write(user_input)

    # Call n8n webhook
    with st.chat_message("assistant", avatar=BOT_AVATAR):
        with st.spinner("Thinking…"):
            try:
                resp = requests.post(
                    webhook_url,
                    json={
                        "message":   user_input,
                        "sessionId": st.session_state.session_id,
                    },
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()

                reply  = data.get("reply",  "Sorry, I didn't get a response.")
                intent = data.get("intent", "inquiry")
                status = data.get("status", "none")

                st.session_state.last_status = status

                st.write(reply)

                # Show confirmation panels
                if data.get("order_confirmed"):
                    oc = data["order_confirmed"]
                    with st.expander("✅ Order Confirmed", expanded=True):
                        st.markdown(f"**Session ID:** `{data.get('session_id', '')}`")
                        st.markdown(f"**Product Name:** {oc.get('product', oc.get('product_name', ''))}")
                        st.markdown(f"**Customer Name:** {oc.get('name', oc.get('customer_name', ''))}")
                        st.markdown(f"**Phone:** {oc.get('phone', '')}")
                        st.markdown(f"**Quantity:** {oc.get('quantity', '')}")
                        st.markdown(f"**Price:** {oc.get('price', oc.get('final_price', ''))}")
                        st.markdown(f"**Delivery Address:** {oc.get('delivery_address', '')}")

                if data.get("session_confirmed"):
                    sc = data["session_confirmed"]
                    with st.expander("📅 Discovery Call Booked", expanded=True):
                        st.markdown(f"**Session ID:** `{data.get('session_id', '')}`")
                        st.markdown(f"**Name:** {sc.get('name', '')}")
                        st.markdown(f"**Email:** {sc.get('email', '')}")
                        st.markdown(f"**Date:** {sc.get('date', '')}")
                        st.markdown(f"**Time:** {sc.get('time', '')}")
                        st.markdown(f"**Platform:** {sc.get('platform', '')}")

                if data.get("order_cancelled"):
                    oc = data["order_cancelled"]
                    with st.expander("❌ Order Cancelled", expanded=True):
                        st.markdown(f"**Session ID:** `{data.get('session_id', oc.get('session_id', ''))}`")
                        if oc.get('product_name'):
                            st.markdown(f"**Product:** {oc.get('product_name')}")
                        if oc.get('reason'):
                            st.markdown(f"**Reason:** {oc.get('reason')}")

                if data.get("booking_cancelled"):
                    bc = data["booking_cancelled"]
                    with st.expander("❌ Booking Cancelled", expanded=True):
                        st.markdown(f"**Session ID:** `{data.get('session_id', bc.get('session_id', ''))}`")
                        if bc.get('reason'):
                            st.markdown(f"**Reason:** {bc.get('reason')}")

                if status == "not_found":
                    st.warning("⚠️ No order or booking was found with the provided session ID.")

                # Status badge
                badge_color = {
                    "confirmed":  "green",
                    "cancelled":  "red",
                    "not_found":  "red",
                    "collecting": "orange",
                    "negotiating": "orange",
                    "awaiting_confirmation": "blue",
                }.get(status, "gray")

                st.markdown(
                    f"<span style='font-size:0.75rem; color:{badge_color}; "
                    f"border:1px solid {badge_color}; border-radius:4px; "
                    f"padding:1px 6px;'>🏷 {intent} · {status}</span>",
                    unsafe_allow_html=True,
                )

                # Store in history
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": reply,
                    "meta": data,
                })

            except requests.exceptions.ConnectionError:
                err = "⚠️ Could not connect to n8n. Make sure n8n is running at the base URL shown in the sidebar."
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err, "meta": None})

            except requests.exceptions.HTTPError as e:
                if e.response is not None and e.response.status_code == 404:
                    if st.session_state.n8n_mode == "Production":
                        err = "⚠️ 404 Not Found — the workflow is not Active. Go to n8n, open the workflow, and toggle it **Active** (top-right switch)."
                    else:
                        err = "⚠️ 404 Not Found — in Test mode you must click **Execute Workflow** in the n8n editor before sending a message."
                else:
                    err = f"⚠️ HTTP error: {str(e)}"
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err, "meta": None})

            except requests.exceptions.Timeout:
                err = "⚠️ Request timed out. The n8n workflow took too long to respond."
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err, "meta": None})

            except Exception as e:
                err = f"⚠️ Unexpected error: {str(e)}"
                st.error(err)
                st.session_state.messages.append({"role": "assistant", "content": err, "meta": None})
