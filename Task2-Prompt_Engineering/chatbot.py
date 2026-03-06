import csv
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from prompt import prompt_template

load_dotenv()

# --- LOAD DATASET ---
def load_csv_context(filepath):
    lines = ["=== SERVICE CATALOGUE (use ONLY this data to answer questions) ===\n"]
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lines.append(
                f"Service: {row['Service_Name']} | "
                f"Base Price: ${row['Base_Price']} | "
                f"Timeline: {row['Timeline']} | "
                f"Description: {row['Description']} | "
                f"Max Discount: {row['Max_Discount']} | "
                f"Discount Rule: {row['Discount_Logic']}"
            )
    return "\n".join(lines)

csv_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
dataset_context = load_csv_context(csv_path)
full_system_prompt = prompt_template + "\n### CONTEXT\n" + dataset_context + "\n"

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise EnvironmentError("GOOGLE_API_KEY is not set. Please add it to your .env file.")

client = genai.Client(api_key=GOOGLE_API_KEY)

# Start a chat session with system instructions
chat = client.chats.create(
    model="gemini-2.5-flash",
    config=types.GenerateContentConfig(
        system_instruction=full_system_prompt
    )
)

print("==============================================")
print("   AI Sales & Support Chatbot (Gemini)")
print("==============================================")
print("Type your message and press Enter to chat.")
print("Type 'quit' or 'exit' to stop.\n")

# --- CHAT LOOP ---
while True:
    user_input = input("You: ").strip()

    # Exit condition
    if user_input.lower() in ["quit", "exit", ""]:
        print("Bot: Goodbye! Have a great day!")
        break

    # Send message to Gemini and get reply
    try:
        response = chat.send_message(user_input)
        print(f"Bot: {response.text}\n")
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            print("Bot: [Error] API quota exceeded. Please wait a moment or use a different API key.\n")
        elif "401" in error_msg or "API_KEY" in error_msg:
            print("Bot: [Error] Invalid API key. Please check your key in chatbot.py.\n")
        else:
            print(f"Bot: [Error] Something went wrong: {e}\n")
