// ================================
// НАСТРОЙКА API
// ================================

// const API_URL = "http://127.0.0.1:8000/chat"; // локально
const API_URL = "https://kazakh-chatbot-production.up.railway.app/chat";

// ================================
// СОСТОЯНИЕ
// ================================

let isWaiting = false;
let messageCount = 0;
let wordsLearned = 0;
let streakCount = 0;
let pointsCount = 0;

// ================================
// PARTICLE ANIMATION
// ================================

function initParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });

        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ================================
// LEARNING TIPS CAROUSEL
// ================================

const learningTips = [
    { icon: '💡', text: 'Совет: Используйте "Переведи" для быстрого перевода' },
    { icon: '🎯', text: 'Практикуйте каждый день для лучших результатов!' },
    { icon: '📝', text: 'Сохраняйте новые слова в свой словарь' },
    { icon: '🔊', text: 'Попробуйте голосовой ввод для практики произношения' },
    { icon: '⭐', text: 'Выполняйте ежедневные задания для получения очков!' }
];

let currentTipIndex = 0;

function rotateTips() {
    const tipsContainer = document.querySelector('.tip-carousel');
    if (!tipsContainer) return;

    setInterval(() => {
        currentTipIndex = (currentTipIndex + 1) % learningTips.length;
        const tip = learningTips[currentTipIndex];
        
        tipsContainer.innerHTML = `
            <div class="tip-item active">
                <span class="tip-icon">${tip.icon}</span>
                <span class="tip-text">${tip.text}</span>
            </div>
        `;
    }, 5000);
}

// ================================
// ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ
// ================================

async function sendMessage() {
    if (isWaiting) return;

    const input = document.getElementById("message");
    const chat = document.getElementById("chat");
    const welcomeBanner = document.getElementById("welcomeBanner");
    const text = input.value.trim();

    if (!text) return;

    isWaiting = true;

    // Скрываем приветственный баннер
    if (welcomeBanner && welcomeBanner.style.display !== "none") {
        welcomeBanner.style.animation = "slideOut 0.5s ease-out";
        setTimeout(() => {
            welcomeBanner.style.display = "none";
        }, 500);
    }

    // Сообщение пользователя
    const userMessage = document.createElement("div");
    userMessage.className = "message user";
    userMessage.textContent = text;
    chat.appendChild(userMessage);
    
    input.value = "";
    chat.scrollTop = chat.scrollHeight;

    messageCount++;
    updateStats();

    // Индикатор печатания
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

        const botMessage = document.createElement("div");
        botMessage.className = "message bot";
        botMessage.textContent = data.reply;
        chat.appendChild(botMessage);

        chat.scrollTop = chat.scrollHeight;

        // Увеличиваем счетчик слов (примерная оценка)
        const wordCount = data.reply.split(' ').length;
        wordsLearned += Math.floor(wordCount / 10);
        pointsCount += 5;
        
        updateStats();
        checkAchievements();

    } catch (error) {
        typingIndicator.remove();

        const errorMessage = document.createElement("div");
        errorMessage.className = "message bot error";
        errorMessage.textContent = "Сервер временно недоступен или просыпается. Пожалуйста, попробуйте через несколько секунд.";
        chat.appendChild(errorMessage);

        chat.scrollTop = chat.scrollHeight;
    }

    isWaiting = false;
}

// ================================
// БЫСТРЫЕ ДЕЙСТВИЯ
// ================================

function quick(text) {
    const input = document.getElementById("message");
    input.value = text;
    input.focus();
    sendMessage();
}

// ================================
// ОБРАБОТКА НАЖАТИЯ ENTER
// ================================

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// ================================
// ОБРАБОТКА ВВОДА (автоподсказки)
// ================================

function handleInput() {
    const input = document.getElementById("message");
    const value = input.value.toLowerCase();
    
    // Здесь можно добавить автоподсказки
    // Пока просто базовая проверка
}

// ================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ
// ================================

function updateStats() {
    // Обновление счетчика сообщений
    const messageCountEl = document.getElementById("messageCount");
    if (messageCountEl) {
        messageCountEl.textContent = messageCount;
        animateCounter(messageCountEl);
    }

    // Обновление изученных слов
    const wordsLearnedEl = document.getElementById("wordsLearned");
    if (wordsLearnedEl) {
        wordsLearnedEl.textContent = wordsLearned;
        animateCounter(wordsLearnedEl);
    }

    // Обновление очков
    const pointsCountEl = document.getElementById("pointsCount");
    if (pointsCountEl) {
        pointsCountEl.textContent = pointsCount;
        animateCounter(pointsCountEl);
    }

    // Обновление streak
    const streakCountEl = document.getElementById("streakCount");
    if (streakCountEl) {
        streakCountEl.textContent = streakCount;
    }
}

function animateCounter(element) {
    element.style.transform = "scale(1.3)";
    element.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    setTimeout(() => {
        element.style.transform = "scale(1)";
    }, 300);
}

// ================================
// ПРОВЕРКА ДОСТИЖЕНИЙ
// ================================

function checkAchievements() {
    const badges = document.querySelectorAll('.achievement-badge');
    
    // Первое сообщение
    if (messageCount >= 1 && badges[0]) {
        badges[0].classList.add('unlocked');
        badges[0].classList.remove('locked');
    }
    
    // 10 сообщений
    if (messageCount >= 10 && badges[1]) {
        badges[1].classList.add('unlocked');
        badges[1].classList.remove('locked');
        showAchievementNotification('🔥 Достижение разблокировано: Энтузиаст!');
    }
    
    // 50 слов
    if (wordsLearned >= 50 && badges[2]) {
        badges[2].classList.add('unlocked');
        badges[2].classList.remove('locked');
        showAchievementNotification('📚 Достижение разблокировано: Студент!');
    }
    
    // 7 дней подряд (пример)
    if (streakCount >= 7 && badges[3]) {
        badges[3].classList.add('unlocked');
        badges[3].classList.remove('locked');
        showAchievementNotification('⭐ Достижение разблокировано: Регуляр!');
    }
}

function showAchievementNotification(message) {
    // Создаем уведомление о достижении
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        color: #000;
        padding: 15px 25px;
        border-radius: 15px;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// ================================
// ГОЛОСОВОЙ ВВОД
// ================================

function toggleVoiceInput() {
    // Проверка поддержки Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Ваш браузер не поддерживает голосовой ввод');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ru-RU'; // Можно переключать между ru-RU и kk-KZ
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('message').value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
    };

    recognition.start();
}

// ================================
// ЭМОДЗИ ПИКЕР
// ================================

function toggleEmojiPicker() {
    // Простой список популярных эмодзи
    const emojis = ['👋', '😊', '🎉', '❤️', '👍', '🙏', '🔥', '⭐', '📚', '✨'];
    
    const input = document.getElementById('message');
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    input.value += randomEmoji;
    input.focus();
}

// ================================
// СОХРАНЕНИЕ СЛОВА
// ================================

function saveWord(word) {
    // Сохранение в localStorage
    let savedWords = JSON.parse(localStorage.getItem('savedWords') || '[]');
    
    if (!savedWords.includes(word)) {
        savedWords.push(word);
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        
        // Показываем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 5px 20px rgba(46, 204, 113, 0.4);
            z-index: 1000;
            animation: slideInUp 0.4s ease-out;
        `;
        notification.textContent = `✓ Слово "${word}" сохранено!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.4s ease-out';
            setTimeout(() => notification.remove(), 400);
        }, 2000);
    } else {
        alert('Это слово уже сохранено!');
    }
}

// ================================
// ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ
// ================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

// ================================
// МОДАЛЬНОЕ ОКНО
// ================================

function closeModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ================================
// ЗАЩИТА ОТ XSS
// ================================

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ================================
// CSS АНИМАЦИИ
// ================================

const additionalStyles = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-30px);
        }
    }

    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }

    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideOutDown {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(30px);
        }
    }

    .typing-indicator {
        display: flex;
        gap: 6px;
        padding: 10px 15px;
    }

    .typing-dot {
        width: 10px;
        height: 10px;
        background: rgba(255, 215, 0, 0.8);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
    }

    .typing-dot:nth-child(2) { 
        animation-delay: 0.2s; 
    }
    
    .typing-dot:nth-child(3) { 
        animation-delay: 0.4s; 
    }

    @keyframes bounce {
        0%, 80%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.8;
        }
        40% { 
            transform: translateY(-12px) scale(1.1); 
            opacity: 1;
        }
    }

    .message.error {
        background: rgba(231, 76, 60, 0.2);
        border: 2px solid rgba(231, 76, 60, 0.5);
        color: #ff7675;
    }

    /* Keyboard shortcuts hint */
    .keyboard-hint {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(10, 29, 40, 0.9);
        padding: 10px 15px;
        border-radius: 10px;
        font-size: 12px;
        color: var(--text-gray);
        border: 1px solid rgba(255, 215, 0, 0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 100;
    }

    body:hover .keyboard-hint {
        opacity: 1;
    }
`;

// ================================
// ИНИЦИАЛИЗАЦИЯ
// ================================

document.addEventListener("DOMContentLoaded", () => {
    // Добавляем дополнительные стили
    const style = document.createElement("style");
    style.textContent = additionalStyles;
    document.head.appendChild(style);

    // Инициализируем частицы
    initParticles();

    // Запускаем карусель подсказок
    rotateTips();

    // Проверяем сохраненный прогресс
    const savedProgress = localStorage.getItem('userProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        messageCount = progress.messageCount || 0;
        wordsLearned = progress.wordsLearned || 0;
        streakCount = progress.streakCount || 0;
        pointsCount = progress.pointsCount || 0;
        updateStats();
    }

    // Сохраняем прогресс при закрытии страницы
    window.addEventListener('beforeunload', () => {
        const progress = {
            messageCount,
            wordsLearned,
            streakCount,
            pointsCount
        };
        localStorage.setItem('userProgress', JSON.stringify(progress));
    });

    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + T для перевода
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            quick('Переведи на казахский');
        }
        
        // Ctrl/Cmd + D для словаря
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            quick('Объясни это слово');
        }
    });

    console.log("🇰🇿 Qazaq AI готов к работе!");
    console.log("✨ Горячие клавиши:");
    console.log("   Ctrl+T - Быстрый перевод");
    console.log("   Ctrl+D - Словарь");
});

// ================================
// ЭКСПОРТ ДЛЯ ДЕБАГА
// ================================

window.QazaqAI = {
    sendMessage,
    quick,
    saveWord,
    messageCount: () => messageCount,
    stats: () => ({ messageCount, wordsLearned, streakCount, pointsCount })
};
