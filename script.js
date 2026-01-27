// ================================
// API & STATE
// ================================
const API_URL = "https://kazakh-chatbot-production.up.railway.app/chat";

let isWaiting = false;
let messageCount = 0;
let wordsLearned = 0;
let streakCount = 0;
let pointsCount = 0;
let currentXP = 0;
let dailyGoal = 50;
let voiceUsed = false;
let crystals = 100;
let userLevel = 1;
let levelXP = 0;
let nextLevelXP = 100;
let combo = 0;
let maxCombo = 0;
let lastMessageTime = 0;
let comboTimeout = null;
let unlockedAchievements = ['badge-beginner'];
let activePowerUps = [];
let dailyRewardDay = 1;
let dailyRewardClaimed = false;

// Quest tracking
let questProgress = {
    messages: 0,
    voiceUsed: false,
    wordsLearned: 0,
    combo: 0
};

let recognition = null;
let isListening = false;

// ================================
// PARTICLES
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

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x, dy = p1.y - p2.y;
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
// VOICE RECOGNITION
// ================================
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        showVoiceStatus();
        document.getElementById('voiceBtn').classList.add('listening');
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        document.getElementById('message').value = transcript;
        const voiceText = document.querySelector('.voice-text');
        if (voiceText) voiceText.textContent = transcript || 'Слушаю...';
    };

    recognition.onerror = (event) => {
        hideVoiceStatus();
        document.getElementById('voiceBtn').classList.remove('listening');
        isListening = false;
        if (event.error === 'not-allowed') showNotification('❌ Разрешите доступ к микрофону', 'error');
    };

    recognition.onend = () => {
        hideVoiceStatus();
        document.getElementById('voiceBtn').classList.remove('listening');
        isListening = false;
        if (!voiceUsed) {
            voiceUsed = true;
            questProgress.voiceUsed = true;
            updateQuests();
            unlockAchievement('badge-speaker', 'Оратор', 'Вы использовали голосовой ввод!');
        }
    };
}

function toggleVoiceInput() {
    if (!recognition) initVoiceRecognition();
    if (isListening) recognition.stop();
    else {
        try { recognition.start(); }
        catch (error) { console.error('Error starting recognition:', error); }
    }
}

function showVoiceStatus() {
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) voiceStatus.style.display = 'flex';
}

function hideVoiceStatus() {
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) voiceStatus.style.display = 'none';
}

// ================================
// LEVEL SYSTEM (NEW!)
// ================================
function calculateNextLevelXP(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function addXP(amount, showFloating = true) {
    const multiplier = getActiveMultiplier();
    const finalAmount = Math.floor(amount * multiplier);
    
    levelXP += finalAmount;
    currentXP += finalAmount;
    pointsCount += finalAmount;
    
    if (showFloating) showFloatingXP(finalAmount, multiplier > 1);
    
    updateXPBar();
    updateLevelBar();
    updateStats();
    
    // Check level up
    while (levelXP >= nextLevelXP) {
        levelUp();
    }
    
    // Check daily goal
    if (currentXP >= dailyGoal && currentXP - finalAmount < dailyGoal) {
        showCelebration('🎉 Ежедневная цель достигнута!', `Вы заработали ${currentXP} XP сегодня!`);
        addCrystals(20);
    }
    
    saveProgress();
}

function levelUp() {
    levelXP -= nextLevelXP;
    userLevel++;
    nextLevelXP = calculateNextLevelXP(userLevel);
    
    // Show level up modal
    const modal = document.getElementById('levelUpModal');
    const oldLevel = modal.querySelector('.old-level');
    const newLevel = modal.querySelector('.new-level');
    const message = modal.querySelector('.level-up-message');
    const rewards = modal.querySelector('.rewards-display');
    
    oldLevel.textContent = userLevel - 1;
    newLevel.textContent = userLevel;
    message.textContent = getLevelTitle(userLevel);
    
    // Calculate rewards
    const crystalReward = userLevel * 10;
    const xpBonus = userLevel * 5;
    
    rewards.innerHTML = `
        <div class="reward-item">💎 +${crystalReward} Кристаллов</div>
        <div class="reward-item">⭐ +${xpBonus} XP бонус</div>
    `;
    
    modal.style.display = 'flex';
    createConfetti();
    playSound('levelup');
    
    addCrystals(crystalReward);
    
    // Update display
    const userLevelEl = document.getElementById('userLevel');
    const levelNumber = document.getElementById('levelNumber');
    if (userLevelEl) userLevelEl.textContent = userLevel;
    if (levelNumber) levelNumber.textContent = userLevel;
    
    checkAchievements();
}

function getLevelTitle(level) {
    if (level >= 20) return '🏆 Гуру языка';
    if (level >= 15) return '⭐ Мастер';
    if (level >= 10) return '🎯 Эксперт';
    if (level >= 5) return '🔥 Профи';
    return '🌟 Ученик';
}

function closeLevelUp() {
    document.getElementById('levelUpModal').style.display = 'none';
}

function updateLevelBar() {
    const levelFill = document.getElementById('levelFill');
    const currentLevelXPEl = document.getElementById('currentLevelXP');
    const nextLevelXPEl = document.getElementById('nextLevelXP');
    
    const percentage = (levelXP / nextLevelXP) * 100;
    
    if (levelFill) levelFill.style.width = percentage + '%';
    if (currentLevelXPEl) currentLevelXPEl.textContent = levelXP;
    if (nextLevelXPEl) nextLevelXPEl.textContent = nextLevelXP;
}

// ================================
// COMBO SYSTEM (NEW!)
// ================================
function updateCombo() {
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    
    if (timeSinceLastMessage < 10000) { // 10 seconds
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        
        // Show combo indicator
        if (combo >= 3) {
            const comboIndicator = document.getElementById('comboIndicator');
            const comboCount = document.getElementById('comboCount');
            comboCount.textContent = combo;
            comboIndicator.classList.add('show');
            
            // Bonus XP for combo
            if (combo % 5 === 0) {
                const bonusXP = combo * 2;
                addXP(bonusXP);
                showNotification(`🔥 Комбо ×${combo}! Бонус +${bonusXP} XP!`);
            }
        }
        
        // Reset combo timeout
        if (comboTimeout) clearTimeout(comboTimeout);
        comboTimeout = setTimeout(() => {
            combo = 0;
            document.getElementById('comboIndicator').classList.remove('show');
        }, 10000);
        
        // Update combo quest
        if (combo >= 5) {
            questProgress.combo = Math.max(questProgress.combo, combo);
            updateQuests();
            
            if (combo >= 10) {
                unlockAchievement('badge-combo', 'Комбо мастер', 'Достигнут комбо ×10!');
            }
        }
    } else {
        combo = 0;
    }
    
    lastMessageTime = now;
}

// ================================
// CRYSTALS SYSTEM (NEW!)
// ================================
function addCrystals(amount) {
    crystals += amount;
    const crystalsEl = document.getElementById('crystalsCount');
    if (crystalsEl) {
        crystalsEl.textContent = crystals;
        animateCounter(crystalsEl);
    }
    saveProgress();
}

function spendCrystals(amount) {
    if (crystals >= amount) {
        crystals -= amount;
        const crystalsEl = document.getElementById('crystalsCount');
        if (crystalsEl) crystalsEl.textContent = crystals;
        saveProgress();
        return true;
    }
    showNotification('❌ Недостаточно кристаллов!', 'error');
    return false;
}

// ================================
// POWER-UPS SYSTEM (NEW!)
// ================================
function openPowerUpModal() {
    document.getElementById('powerUpModal').style.display = 'flex';
}

function closePowerUpModal() {
    document.getElementById('powerUpModal').style.display = 'none';
}

function usePowerUp(type) {
    const costs = {
        double_xp: 50,
        hint: 30,
        streak_freeze: 40
    };
    
    if (!spendCrystals(costs[type])) return;
    
    const duration = type === 'double_xp' ? 15 * 60 * 1000 : null;
    const powerUp = {
        type,
        startTime: Date.now(),
        duration,
        endTime: duration ? Date.now() + duration : null
    };
    
    activePowerUps.push(powerUp);
    updateActivePowerUps();
    closePowerUpModal();
    
    const messages = {
        double_xp: '✨ Двойной XP активирован на 15 минут!',
        hint: '💡 Подсказка доступна!',
        streak_freeze: '❄️ Заморозка серии активирована!'
    };
    
    showNotification(messages[type]);
    
    if (type === 'double_xp') {
        setTimeout(() => {
            activePowerUps = activePowerUps.filter(p => p.type !== 'double_xp');
            updateActivePowerUps();
            showNotification('✨ Двойной XP закончился', 'info');
        }, duration);
    }
    
    // Check achievement
    const usedPowerUps = new Set(activePowerUps.map(p => p.type));
    if (usedPowerUps.size >= 3) {
        unlockAchievement('badge-powerup', 'Стратег', 'Использованы все типы бонусов!');
    }
}

function getActiveMultiplier() {
    const hasDoubleXP = activePowerUps.some(p => p.type === 'double_xp' && 
                                             (!p.endTime || Date.now() < p.endTime));
    return hasDoubleXP ? 2 : 1;
}

function updateActivePowerUps() {
    const container = document.getElementById('activePowerUps');
    if (!container) return;
    
    container.innerHTML = '';
    activePowerUps.forEach(powerUp => {
        if (powerUp.endTime && Date.now() > powerUp.endTime) return;
        
        const div = document.createElement('div');
        div.className = 'active-power-up';
        
        const icons = {
            double_xp: '✨',
            hint: '💡',
            streak_freeze: '❄️'
        };
        
        const names = {
            double_xp: 'Двойной XP',
            hint: 'Подсказка',
            streak_freeze: 'Заморозка'
        };
        
        if (powerUp.duration) {
            const remaining = Math.ceil((powerUp.endTime - Date.now()) / 1000);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            div.innerHTML = `
                <span class="power-up-icon">${icons[powerUp.type]}</span>
                <span class="power-up-name">${names[powerUp.type]}</span>
                <span class="power-up-timer">${minutes}:${seconds.toString().padStart(2, '0')}</span>
            `;
        } else {
            div.innerHTML = `
                <span class="power-up-icon">${icons[powerUp.type]}</span>
                <span class="power-up-name">${names[powerUp.type]}</span>
            `;
        }
        
        container.appendChild(div);
    });
}

// ================================
// DAILY REWARDS (NEW!)
// ================================
function checkDailyReward() {
    const lastClaim = localStorage.getItem('lastDailyReward');
    const today = new Date().toDateString();
    
    if (lastClaim !== today) {
        dailyRewardClaimed = false;
        setTimeout(() => {
            document.getElementById('dailyRewardModal').style.display = 'flex';
            updateDailyRewardsDisplay();
        }, 2000);
    }
}

function updateDailyRewardsDisplay() {
    const grid = document.getElementById('dailyRewardsGrid');
    const daySpan = document.getElementById('dailyDay');
    
    if (!grid) return;
    
    daySpan.textContent = dailyRewardDay;
    
    const rewards = [5, 10, 15, 20, 25, 30, 50];
    grid.innerHTML = '';
    
    rewards.forEach((xp, index) => {
        const day = index + 1;
        const div = document.createElement('div');
        div.className = 'daily-reward-item';
        
        if (day < dailyRewardDay) div.classList.add('claimed');
        if (day === dailyRewardDay) div.classList.add('today');
        if (day === 7) div.classList.add('jackpot');
        
        div.innerHTML = `
            <div class="reward-icon">${day === 7 ? '🏆' : '💎'}</div>
            <div class="reward-value">+${xp} XP</div>
            <div class="reward-day">День ${day}</div>
        `;
        
        grid.appendChild(div);
    });
}

function claimDailyReward() {
    if (dailyRewardClaimed) return;
    
    const rewards = [5, 10, 15, 20, 25, 30, 50];
    const xpReward = rewards[dailyRewardDay - 1] || 5;
    const crystalReward = dailyRewardDay * 5;
    
    addXP(xpReward, false);
    addCrystals(crystalReward);
    
    localStorage.setItem('lastDailyReward', new Date().toDateString());
    dailyRewardClaimed = true;
    
    showNotification(`🎁 Получено: +${xpReward} XP и +${crystalReward} 💎`);
    
    dailyRewardDay = dailyRewardDay >= 7 ? 1 : dailyRewardDay + 1;
    
    document.getElementById('dailyRewardModal').style.display = 'none';
    createConfetti();
}

// ================================
// FLOATING XP (NEW!)
// ================================
function showFloatingXP(amount, isBonus = false) {
    const container = document.getElementById('floatingXP');
    const div = document.createElement('div');
    div.className = 'floating-xp' + (isBonus ? ' bonus' : '');
    div.textContent = `+${amount} XP` + (isBonus ? ' ✨' : '');
    div.style.left = (Math.random() * 80 + 10) + '%';
    container.appendChild(div);
    
    setTimeout(() => div.remove(), 2000);
}

// ================================
// REST OF THE CODE (confetti, notifications, etc.)
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

function showCelebration(title, message) {
    const modal = document.getElementById('celebrationModal');
    modal.querySelector('.celebration-title').textContent = title;
    modal.querySelector('.celebration-message').textContent = message;
    modal.style.display = 'flex';
    createConfetti();
    playSound('celebration');
}

function closeCelebration() {
    document.getElementById('celebrationModal').style.display = 'none';
}

function showNotification(text, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function playSound(soundType) {
    console.log(`🔊 Playing sound: ${soundType}`);
}

// Continue with remaining functions...

// ================================
// QUESTS & ACHIEVEMENTS
// ================================
function updateQuests() {
    const quest1 = document.getElementById('quest1');
    if (quest1 && questProgress.messages < 5) {
        quest1.querySelector('.quest-progress').textContent = `${questProgress.messages}/5`;
        if (questProgress.messages >= 5) completeQuest(quest1, 10, 5);
    }
    
    const quest2 = document.getElementById('quest2');
    if (quest2 && questProgress.voiceUsed) {
        quest2.querySelector('.quest-progress').textContent = '1/1';
        completeQuest(quest2, 15, 10);
    }
    
    const quest3 = document.getElementById('quest3');
    if (quest3 && questProgress.wordsLearned < 10) {
        quest3.querySelector('.quest-progress').textContent = `${questProgress.wordsLearned}/10`;
        if (questProgress.wordsLearned >= 10) completeQuest(quest3, 20, 15);
    }
    
    const quest4 = document.getElementById('quest4');
    if (quest4 && questProgress.combo < 5) {
        quest4.querySelector('.quest-progress').textContent = `${questProgress.combo}/5`;
        if (questProgress.combo >= 5) completeQuest(quest4, 30, 25);
    }
}

function completeQuest(questElement, xpReward, crystalReward) {
    if (!questElement.classList.contains('completed')) {
        questElement.classList.add('completed');
        questElement.querySelector('.quest-checkbox').innerHTML = '✓';
        addXP(xpReward);
        addCrystals(crystalReward);
        showNotification(`✅ Задание выполнено! +${xpReward} XP, +${crystalReward} 💎`);
        playSound('quest');
    }
}

function unlockAchievement(badgeId, name, description) {
    const badge = document.getElementById(badgeId);
    if (badge && badge.classList.contains('locked')) {
        badge.classList.remove('locked');
        badge.classList.add('unlocked');
        unlockedAchievements.push(badgeId);
        updateAchievementCount();
        showCelebration(`🏆 Новое достижение: ${name}!`, description);
        addXP(25);
        addCrystals(15);
    }
}

function checkAchievements() {
    if (messageCount >= 10) unlockAchievement('badge-enthusiast', 'Энтузиаст', 'Отправлено 10 сообщений');
    if (wordsLearned >= 50) unlockAchievement('badge-student', 'Студент', 'Изучено 50 слов');
    if (streakCount >= 7) unlockAchievement('badge-regular', 'Регуляр', '7 дней подряд');
    if (messageCount >= 100) unlockAchievement('badge-master', 'Мастер', 'Отправлено 100 сообщений');
    if (streakCount >= 30) unlockAchievement('badge-legend', 'Легенда', '30 дней подряд');
    if (wordsLearned >= 1000) unlockAchievement('badge-polyglot', 'Полиглот', '1000 слов изучено');
    if (userLevel >= 10) unlockAchievement('badge-champion', 'Чемпион', 'Достигнут 10 уровень');
}

function updateAchievementCount() {
    const countEl = document.getElementById('unlockedCount');
    if (countEl) countEl.textContent = unlockedAchievements.length;
}

// ================================
// MAIN MESSAGE SENDING
// ================================
async function sendMessage() {
    if (isWaiting) return;

    const input = document.getElementById("message");
    const chat = document.getElementById("chat");
    const welcomeBanner = document.getElementById("welcomeBanner");
    const text = input.value.trim();

    if (!text) return;

    isWaiting = true;

    if (welcomeBanner && welcomeBanner.style.display !== "none") {
        welcomeBanner.style.animation = "slideOut 0.5s ease-out";
        setTimeout(() => welcomeBanner.style.display = "none", 500);
    }

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
    updateCombo();

    addXP(5);

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
// UTILITY FUNCTIONS
// ================================
function quick(text) {
    document.getElementById("message").value = text;
    sendMessage();
}

function handleKeyPress(event) {
    if (event.key === "Enter") sendMessage();
}

function handleInput() {
    // Auto-suggestions can be added here
}

function updateStats() {
    const els = {
        messageCount: document.getElementById("messageCount"),
        wordsLearned: document.getElementById("wordsLearned"),
        pointsCount: document.getElementById("pointsCount"),
        streakCount: document.getElementById("streakCount")
    };
    
    if (els.messageCount) { els.messageCount.textContent = messageCount; animateCounter(els.messageCount); }
    if (els.wordsLearned) { els.wordsLearned.textContent = wordsLearned; animateCounter(els.wordsLearned); }
    if (els.pointsCount) { els.pointsCount.textContent = pointsCount; animateCounter(els.pointsCount); }
    if (els.streakCount) els.streakCount.textContent = streakCount;
}

function animateCounter(element) {
    element.style.transform = "scale(1.3)";
    element.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    setTimeout(() => element.style.transform = "scale(1)", 300);
}

function updateXPBar() {
    const xpFill = document.getElementById('xpFill');
    const currentXPEl = document.getElementById('currentXP');
    const percentage = Math.min((currentXP / dailyGoal) * 100, 100);
    
    if (xpFill) xpFill.style.width = percentage + '%';
    if (currentXPEl) currentXPEl.textContent = currentXP;
}

function toggleEmojiPicker() {
    const emojis = ['👋', '😊', '🎉', '❤️', '👍', '🙏', '🔥', '⭐', '📚', '✨'];
    const input = document.getElementById('message');
    input.value += emojis[Math.floor(Math.random() * emojis.length)];
    input.focus();
}

function saveWord(word) {
    let savedWords = JSON.parse(localStorage.getItem('savedWords') || '[]');
    if (!savedWords.includes(word)) {
        savedWords.push(word);
        localStorage.setItem('savedWords', JSON.stringify(savedWords));
        showNotification(`✓ Слово "${word}" сохранено!`);
        addXP(3);
        addCrystals(2);
    } else {
        showNotification('ℹ️ Это слово уже сохранено', 'info');
    }
}

function speakWord(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'kk-KZ';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
        showNotification('🔊 Воспроизведение...');
    } else {
        showNotification('❌ Синтез речи не поддерживается', 'error');
    }
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// ================================
// SAVE & LOAD PROGRESS
// ================================
function saveProgress() {
    const progress = {
        messageCount, wordsLearned, streakCount, pointsCount, currentXP,
        voiceUsed, questProgress, lastVisit: new Date().toDateString(),
        crystals, userLevel, levelXP, nextLevelXP, maxCombo,
        unlockedAchievements, dailyRewardDay, dailyRewardClaimed
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
        questProgress = progress.questProgress || { messages: 0, voiceUsed: false, wordsLearned: 0, combo: 0 };
        crystals = progress.crystals || 100;
        userLevel = progress.userLevel || 1;
        levelXP = progress.levelXP || 0;
        nextLevelXP = progress.nextLevelXP || 100;
        maxCombo = progress.maxCombo || 0;
        unlockedAchievements = progress.unlockedAchievements || ['badge-beginner'];
        dailyRewardDay = progress.dailyRewardDay || 1;
        dailyRewardClaimed = progress.dailyRewardClaimed || false;
        
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
            
            currentXP = 0;
        }
        
        updateStats();
        updateXPBar();
        updateLevelBar();
        updateQuests();
        updateAchievementCount();
    }
}

// ================================
// TIPS CAROUSEL
// ================================
const learningTips = [
    { icon: '💡', text: 'Совет: Используйте "Переведи" для быстрого перевода' },
    { icon: '🎯', text: 'Практикуйте каждый день для лучших результатов!' },
    { icon: '📝', text: 'Сохраняйте новые слова в свой словарь' },
    { icon: '🔊', text: 'Попробуйте голосовой ввод для практики произношения' },
    { icon: '⭐', text: 'Выполняйте ежедневные задания для получения очков!' },
    { icon: '🎤', text: 'Говорите вслух для лучшего запоминания' },
    { icon: '🏆', text: 'Получайте достижения за свой прогресс!' },
    { icon: '💎', text: 'Собирайте кристаллы для покупки бонусов!' },
    { icon: '🔥', text: 'Стройте комбо для получения бонусных очков!' }
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
// QUEST TIMER
// ================================
function updateQuestTimer() {
    const timerEl = document.getElementById('questTimer');
    if (!timerEl) return;
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ================================
// INITIALIZATION
// ================================
document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    rotateTips();
    loadProgress();
    initVoiceRecognition();
    checkDailyReward();

    window.addEventListener('beforeunload', saveProgress);
    setInterval(saveProgress, 30000);
    setInterval(updateQuestTimer, 1000);
    setInterval(updateActivePowerUps, 1000);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            quick('Переведи на казахский');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            quick('Объясни это слово');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            toggleVoiceInput();
        }
    });

    console.log("🇰🇿 Qazaq AI готов к работе!");
    console.log("✨ Горячие клавиши: Ctrl+T (перевод), Ctrl+D (словарь), Ctrl+M (голос)");
});

window.QazaqAI = {
    sendMessage, quick, saveWord, speakWord, toggleVoiceInput, addXP,
    messageCount: () => messageCount,
    stats: () => ({ messageCount, wordsLearned, streakCount, pointsCount, currentXP, userLevel, crystals, combo })
};
