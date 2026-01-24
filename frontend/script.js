// ================================
// НАСТРОЙКА API
// ================================

// Локальный backend
const API_URL = "http://127.0.0.1:8000/chat";

// Для деплоя (когда будет backend в интернете)
// const API_URL = "https://ТВОЙ_BACKEND_URL/chat";

// ================================
// СОСТОЯНИЕ
// ================================

let isWaiting = false;
let messageCount = 0;

// ================================
// ОСНОВНАЯ ФУНКЦИЯ
// ================================

async function sendMessage() {
    if (isWaiting) return;

    const input = document.getElementById("message");
    const chat = document.getElementById("chat");
    const welcomeBanner = document.getElementById("welcomeBanner");
    const text = input.value.trim();

    if (!text) return;

    isWaiting = true;

    // скрываем приветственный баннер
    if (welcomeBanner) {
        welcomeBanner.style.display = "none";
    }

    // сообщение пользователя
    chat.innerHTML += `<div class="message user">${escapeHtml(text)}</div>`;
    input.value = "";
    chat.scrollTop = chat.scrollHeight;

    messageCount++;
    updateMessageCount();

    // индикатор печатания
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "message bot typing-indicator";
    typingIndicator.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    chat.appendChild(typingIndicator);
    chat.scrollTop = chat.scrollHeight;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        typingIndicator.remove();

        chat.innerHTML += `
            <div class="message bot">
                ${escapeHtml(data.reply)}
            </div>
        `;

        chat.scrollTop = chat.scrollHeight;

        messageCount++;
        updateMessageCount();

    } catch (error) {
        typingIndicator.remove();

        chat.innerHTML += `
            <div class="message bot error">
                Сервер временно недоступен или просыпается.
                Пожалуйста, попробуйте через несколько секунд.
            </div>
        `;

        chat.scrollTop = chat.scrollHeight;
    }

    isWaiting = false;
}

// ================================
// БЫСТРЫЕ КНОПКИ
// ================================

function quick(text) {
    const input = document.getElementById("message");
    input.value = text;
    input.focus();
    sendMessage();
}

// ================================
// ENTER
// ================================

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// ================================
// СЧЁТЧИК СООБЩЕНИЙ
// ================================

function updateMessageCount() {
    const countElement = document.getElementById("messageCount");
    if (countElement) {
        countElement.textContent = messageCount;
        countElement.style.transform = "scale(1.2)";
        setTimeout(() => {
            countElement.style.transform = "scale(1)";
        }, 300);
    }
}

// ================================
// ЗАЩИТА ОТ HTML
// ================================

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ================================
// СТИЛИ ДЛЯ ИНДИКАТОРА
// ================================

document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `
        .typing-indicator {
            display: flex;
            gap: 6px;
        }
        .typing-dot {
            width: 8px;
            height: 8px;
            background: rgba(244, 208, 63, 0.7);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
        }

        .message.error {
            background: rgba(231, 76, 60, 0.15);
            border: 1px solid rgba(231, 76, 60, 0.4);
        }
    `;
    document.head.appendChild(style);

    console.log("🇰🇿 Qazaq AI готов к работе");
});