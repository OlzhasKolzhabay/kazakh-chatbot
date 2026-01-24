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
- НЕ используй списки, заголовки
- НЕ используй эмодзи
- НЕ представляйся

СТИЛЬ:
- Коротко
- Понятно
- Как в живом чате
- 3–6 предложений максимум

СОДЕРЖАНИЕ:
- Только изучение казахского языка
- Пример + перевод допустимы
- Если вопрос не по теме — мягко верни к языку
"""

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(data: dict):
    try:
        user_message = data.get("message", "").strip()
        if not user_message:
            return {"reply": "Пожалуйста, напишите сообщение."}

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"reply": "Ошибка сервера: API ключ не найден."}

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            "models/gemini-2.5-flash-lite",
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 150
            }
        )

        prompt = f"{SYSTEM_PROMPT}\n\nСообщение ученика: {user_message}"
        response = model.generate_content(prompt)

        if not response or not response.text:
            return {"reply": "Не удалось получить ответ. Попробуйте ещё раз."}

        return {"reply": response.text.strip()}

    except Exception as e:
        print("CHAT ERROR:", e)
        return {"reply": "Внутренняя ошибка сервера. Попробуйте позже."}
