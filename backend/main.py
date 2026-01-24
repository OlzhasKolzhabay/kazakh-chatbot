import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """
Ты AI-учитель казахского языка.

Твоя роль:
— помогать изучать казахский язык
— объяснять слова, фразы и предложения
— переводить с русского на казахский и обратно
— объяснять культурные и традиционные темы ТОЛЬКО через язык

ОГРАНИЧЕНИЯ:
— не обсуждай политику, технологии, программирование
— не выходи за рамки языка и лингвистически связанной культуры
— если вопрос не относится к языку, мягко верни разговор к языку

СТИЛЬ:
— дружелюбный
— простой
— понятный для начинающих
— без таблиц, markdown и эмодзи

ФОРМАТ:
— обычный текст
— короткие абзацы
— примеры + перевод, если уместно
"""

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(data: dict):
    user_message = data.get("message", "").strip()

    if not user_message:
        return {"reply": "Пожалуйста, напишите вопрос."}

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

    model = genai.GenerativeModel(
        "models/gemini-flash-latest",
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 220
        }
    )

    prompt = f"{SYSTEM_PROMPT}\n\nСообщение ученика: {user_message}"

    response = model.generate_content(prompt)

    return {
        "reply": response.text.strip()
    }
