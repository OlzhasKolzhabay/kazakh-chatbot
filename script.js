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
let currentXP = 0;
let dailyGoal = 50;
let voiceUsed = false;

// Quest tracking
let questProgress = {
    messages: 0,
    voiceUsed: false,
    wordsLearned: 0
};

// Voice recognition
let recognition = null;
let isListening = false;

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
// VOICE RECOGNITION (NEW!)
// ================================

function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Get selected language
    const langSelect = document.getElementById('voiceLangSelect');
    const selectedLang = langSelect ? langSelect.value : 'ru-RU';
    
    recognition.lang = selectedLang === 'auto' ? 'ru-RU' : selectedLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        showVoiceStatus();
        const voiceBtn = document.getElementById('voiceBtn');
        voiceBtn.classList.add('listening');
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');

        document.getElementById('message').value = transcript;
        
        // Update voice status text
        const voiceText = document.querySelector('.voice-text');
        if (voiceText) {
            voiceText.textContent = transcript || 'Слушаю...';
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        hideVoiceStatus();
        const voiceBtn = document.getElementById('voiceBtn');
        voiceBtn.classList.remove('listening');
        isListening = false;
        
        if (event.error === 'not-allowed') {
            showNotification('❌ Разрешите доступ к микрофону', 'error');
        } else if (event.error !== 'no-speech') {
            showNotification('❌ Ошибка распознавания речи', 'error');
        }
    };

    recognition.onend = () => {
        hideVoiceStatus();
        const voiceBtn = document.getElementById('voiceBtn');
        voiceBtn.classList.remove('listening');
        isListening = false;
        
        // Track voice usage for quest
        if (!voiceUsed) {
            voiceUsed = true;
            questProgress.voiceUsed = true;
            updateQuests();
            // Unlock speaker achievement
            unlockAchievement('badge-speaker', 'Оратор', 'Вы использовали голосовой ввод!');
        }
    };
}

function toggleVoiceInput() {
    if (!recognition) {
        initVoiceRecognition();
    }

    if (isListening) {
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }
}

function showVoiceStatus() {
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) {
        voiceStatus.style.display = 'flex';
    }
}

function hideVoiceStatus() {
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) {
        voiceStatus.style.display = 'none';
    }
}

// ================================
// CONFETTI ANIMATION (Duolingo style)
// ================================

function createConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
    }
}

// ================================
// CELEBRATION MODAL (NEW!)
// ================================

function showCelebration(title, message) {
    const modal = document.getElementById('celebrationModal');
    const titleEl = modal.querySelector('.celebration-title');
    const messageEl = modal.querySelector('.celebration-message');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    modal.style.display = 'flex';
    createConfetti();
    
    // Play celebration sound (if available)
    playSound('celebration');
}

function closeCelebration() {
    const modal = document.getElementById('celebrationModal');
    modal.style.display = 'none';
}

// ================================
// NOTIFICATIONS (NEW!)
// ================================

function showNotification(text, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = text;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================================
// XP SYSTEM (Duolingo style)
// ================================

function addXP(amount) {
    currentXP += amount;
    pointsCount += amount;
    
    updateXPBar();
    updateStats();
    
    // Check if daily goal reached
    if (currentXP >= dailyGoal) {
        showCelebration('🎉 Ежедневная цель достигнута!', `Вы заработали ${currentXP} XP сегодня!`);
    }
    
    saveProgress();
}

function updateXPBar() {
    const xpFill = document.getElementById('xpFill');
    const currentXPEl = document.getElementById('currentXP');
    const percentage = Math.min((currentXP / dailyGoal) * 100, 100);
    
    if (xpFill) {
        xpFill.style.width = percentage + '%';
    }
    if (currentXPEl) {
        currentXPEl.textContent = currentXP;
    }
}

// ================================
// QUESTS SYSTEM (NEW!)
// ================================

function updateQuests() {
    // Quest 1: Send 5 messages
    const quest1 = document.getElementById('quest1');
    if (quest1 && questProgress.messages < 5) {
        const progressEl = quest1.querySelector('.quest-progress');
        progressEl.textContent = `${questProgress.messages}/5`;
        
        if (questProgress.messages >= 5) {
            completeQuest(quest1, 10);
        }
    }
    
    // Quest 2: Use voice input
    const quest2 = document.getElementById('quest2');
    if (quest2 && questProgress.voiceUsed) {
        const progressEl = quest2.querySelector('.quest-progress');
        progressEl.textContent = '1/1';
        completeQuest(quest2, 15);
    }
    
    // Quest 3: Learn 10 words
    const quest3 = document.getElementById('quest3');
    if (quest3 && questProgress.wordsLearned < 10) {
        const progressEl = quest3.querySelector('.quest-progress');
        progressEl.textContent = `${questProgress.wordsLearned}/10`;
        
        if (questProgress.wordsLearned >= 10) {
            completeQuest(quest3, 20);
        }
    }
}

function completeQuest(questElement, xpReward) {
    if (!questElement.classList.contains('completed')) {
        questElement.classList.add('completed');
        const checkbox = questElement.querySelector('.quest-checkbox');
        checkbox.innerHTML = '✓';
        
        addXP(xpReward);
        showNotification(`✅ Задание выполнено! +${xpReward} XP`);
        playSound('quest');
    }
}

// ================================
// ACHIEVEMENTS (Enhanced)
// ================================

function unlockAchievement(badgeId, name, description) {
    const badge = document.getElementById(badgeId);
    if (badge && badge.classList.contains('locked')) {
        badge.classList.remove('locked');
        badge.classList.add('unlocked');
        showCelebration(`🏆 Новое достижение: ${name}!`, description);
        addXP(25); // Bonus XP for achievement
    }
}

function checkAchievements() {
    // Enthusiast: 10 messages
    if (messageCount >= 10) {
        unlockAchievement('badge-enthusiast', 'Энтузиаст', 'Отправлено 10 сообщений');
    }
    
    // Student: 50 words
    if (wordsLearned >= 50) {
        unlockAchievement('badge-student', 'Студент', 'Изучено 50 слов');
    }
    
    // Regular: 7 day streak
    if (streakCount >= 7) {
        unlockAchievement('badge-regular', 'Регуляр', '7 дней подряд');
    }
    
    // Master: 100 messages
    if (messageCount >= 100) {
        unlockAchievement('badge-master', 'Мастер', 'Отправлено 100 сообщений');
    }
}

// ================================
// SOUND EFFECTS (placeholder)
// ================================

function playSound(soundType) {
    // In a real app, you would play actual sound files here
    // For now, we'll just log it
    console.log(`🔊 Playing sound: ${soundType}`);
}

// ================================
// LEARNING TIPS CAROUSEL
// ================================

const learningTips = [
    { icon: '💡', text: 'Совет: Используйте "Переведи" для быстрого перевода' },
    { icon: '🎯', text: 'Практикуйте каждый день для лучших результатов!' },
    { icon: '📝', text: 'Сохраняйте новые слова в свой словарь' },
    { icon: '🔊', text: 'Попробуйте голосовой ввод для практики произношения' },
    { icon: '⭐', text: 'Выполняйте ежедневные задания для получения очков!' },
    { icon: '🎤', text: 'Говорите вслух для лучшего запоминания' },
    { icon: '🏆', text: 'Получайте достижения за свой прогресс!' }
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
    questProgress.messages++;
    updateStats();
    updateQuests();

    // Add XP for sending message
    addXP(5);

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
        questProgress.wordsLearned += Math.floor(wordCount / 10);
        
        updateStats();
        updateQuests();
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
// ОБРАБОТКА ВВОДА
// ================================

function handleInput() {
    const input = document.getElementById("message");
    const value = input.value.toLowerCase();
    
    // Можно добавить автоподсказки
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
// ЭМОДЗИ ПИКЕР
// ================================

function toggleEmojiPicker() {
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
    let savedWords = JSON.parse(localStorage.getItem('savedWords') || '[]');
    
    if (!savedWords.includes(word)) {
        savedWords.push(word);
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        
        showNotification(`✓ Слово "${word}" сохранено!`);
        addXP(3);
    } else {
        showNotification('ℹ️ Это слово уже сохранено', 'info');
    }
}

// ================================
// ПРОИЗНОШЕНИЕ СЛОВА
// ================================

function speakWord(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'kk-KZ'; // Казахский язык
        utterance.rate = 0.8; // Медленнее для лучшего понимания
        speechSynthesis.speak(utterance);
        
        showNotification('🔊 Воспроизведение...');
    } else {
        showNotification('❌ Синтез речи не поддерживается', 'error');
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
// СОХРАНЕНИЕ И ЗАГРУЗКА ПРОГРЕССА
// ================================

function saveProgress() {
    const progress = {
        messageCount,
        wordsLearned,
        streakCount,
        pointsCount,
        currentXP,
        voiceUsed,
        questProgress,
        lastVisit: new Date().toDateString()
    };
    localStorage.setItem('userProgress', JSON.stringify(progress));
}

function loadProgress() {
    const saved = localStorage.getItem('userProgress');
    if (saved) {
        const progress = JSON.parse(saved);
        messageCount = progress.messageCount || 0;
        wordsLearned = progress.wordsLearned || 0;
        streakCount = progress.streakCount || 0;
        pointsCount = progress.pointsCount || 0;
        currentXP = progress.currentXP || 0;
        voiceUsed = progress.voiceUsed || false;
        questProgress = progress.questProgress || { messages: 0, voiceUsed: false, wordsLearned: 0 };
        
        // Check streak
        const today = new Date().toDateString();
        if (progress.lastVisit !== today) {
            const lastDate = new Date(progress.lastVisit);
            const todayDate = new Date(today);
            const diffTime = Math.abs(todayDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streakCount++;
                showNotification(`🔥 Серия продолжается! ${streakCount} дней подряд!`);
            } else if (diffDays > 1) {
                streakCount = 1;
                showNotification('ℹ️ Серия прервалась, начинаем заново!', 'info');
            }
            
            // Reset daily XP
            currentXP = 0;
        }
        
        updateStats();
        updateXPBar();
        updateQuests();
    }
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

    // Загружаем прогресс
    loadProgress();

    // Инициализируем голосовое распознавание
    initVoiceRecognition();

    // Сохраняем прогресс при закрытии страницы
    window.addEventListener('beforeunload', saveProgress);

    // Периодически сохраняем прогресс
    setInterval(saveProgress, 30000); // Каждые 30 секунд

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

        // Ctrl/Cmd + M для голосового ввода
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            toggleVoiceInput();
        }
    });

    // Change voice language when select changes
    const voiceLangSelect = document.getElementById('voiceLangSelect');
    if (voiceLangSelect) {
        voiceLangSelect.addEventListener('change', () => {
            if (recognition) {
                const selectedLang = voiceLangSelect.value;
                recognition.lang = selectedLang === 'auto' ? 'ru-RU' : selectedLang;
            }
        });
    }

    console.log("🇰🇿 Qazaq AI готов к работе!");
    console.log("✨ Горячие клавиши:");
    console.log("   Ctrl+T - Быстрый перевод");
    console.log("   Ctrl+D - Словарь");
    console.log("   Ctrl+M - Голосовой ввод");
});

// ================================
// ЭКСПОРТ ДЛЯ ДЕБАГА
// ================================

window.QazaqAI = {
    sendMessage,
    quick,
    saveWord,
    speakWord,
    toggleVoiceInput,
    addXP,
    messageCount: () => messageCount,
    stats: () => ({ messageCount, wordsLearned, streakCount, pointsCount, currentXP })
};
