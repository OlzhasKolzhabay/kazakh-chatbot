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

СТРОГИЕ ПРАВИЛА ФОРМАТА:
- Пиши ТОЛЬКО обычным текстом
- НЕ используй markdown
- НЕ используй **жирный текст**
- НЕ используй ###, списки, заголовки
- НЕ используй эмодзи
- НЕ пиши длинные вступления
- НЕ представляйся

СТИЛЬ ОТВЕТА:
- Коротко
- Понятно
- Как в живом чате
- 3–6 предложений максимум

СОДЕРЖАНИЕ:
- Только изучение казахского языка
- Можно приводить пример + перевод
- Если вопрос не про язык — вежливо верни к теме

Отвечай сразу по сути вопроса.
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
