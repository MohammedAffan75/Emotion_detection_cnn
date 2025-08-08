class EmotionDetector {
    constructor() {
        this.isDetecting = false;
        this.emotionCounts = {};
        this.totalDetections = 0;
        this.initializeElements();
        this.bindEvents();
        this.initializeEmotionCounts();
    }

    initializeElements() {
        this.videoStream = document.getElementById('video-stream');
        this.toggleBtn = document.getElementById('toggle-stream');
        this.captureBtn = document.getElementById('capture-emotion');
        this.resultsDiv = document.getElementById('emotion-results');
        this.emotionBars = document.querySelectorAll('.emotion-bar');
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggleDetection());
        this.captureBtn.addEventListener('click', () => this.captureEmotion());
        
        // Auto-refresh emotion data every 2 seconds when detecting
        setInterval(() => {
            if (this.isDetecting) {
                this.captureEmotion();
            }
        }, 2000);
    }

    initializeEmotionCounts() {
        const emotions = ['happy', 'sad', 'angry', 'surprise', 'fear', 'disgust', 'neutral'];
        emotions.forEach(emotion => {
            this.emotionCounts[emotion] = 0;
        });
    }

    toggleDetection() {
        this.isDetecting = !this.isDetecting;
        
        if (this.isDetecting) {
            this.toggleBtn.textContent = 'Stop Detection';
            this.toggleBtn.classList.remove('btn-primary');
            this.toggleBtn.classList.add('btn-secondary');
            this.videoStream.classList.add('pulse');
            this.showMessage('Detection started! 📹', 'success');
        } else {
            this.toggleBtn.textContent = 'Start Detection';
            this.toggleBtn.classList.remove('btn-secondary');
            this.toggleBtn.classList.add('btn-primary');
            this.videoStream.classList.remove('pulse');
            this.showMessage('Detection stopped', 'info');
        }
    }

    async captureEmotion() {
        if (!this.isDetecting) return;

        try {
            this.captureBtn.classList.add('loading');
            
            const response = await fetch('/detect_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to detect emotion');
            }

            const data = await response.json();
            this.displayResults(data.emotions);
            this.updateStatistics(data.emotions);

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error detecting emotion: ' + error.message, 'error');
        } finally {
            this.captureBtn.classList.remove('loading');
        }
    }

    displayResults(emotions) {
        if (!emotions || emotions.length === 0) {
            this.resultsDiv.innerHTML = '<p class="no-results">No faces detected. Make sure your face is visible! 👤</p>';
            return;
        }

        let html = '';
        emotions.forEach((emotion, index) => {
            const confidence = (emotion.confidence * 100).toFixed(1);
            const isPrimary = index === 0 ? 'primary' : '';
            
            html += `
                <div class="emotion-result ${isPrimary}">
                    <strong>${this.getEmotionEmoji(emotion.emotion)} ${emotion.emotion.toUpperCase()}</strong>
                    <br>
                    Confidence: ${confidence}%
                    <br>
                    <small>Face ${index + 1} detected</small>
                </div>
            `;
        });

        this.resultsDiv.innerHTML = html;
    }

    updateStatistics(emotions) {
        emotions.forEach(emotion => {
            if (this.emotionCounts.hasOwnProperty(emotion.emotion)) {
                this.emotionCounts[emotion.emotion]++;
                this.totalDetections++;
            }
        });

        this.updateEmotionBars();
    }

    updateEmotionBars() {
        this.emotionBars.forEach(bar => {
            const emotion = bar.dataset.emotion;
            const count = this.emotionCounts[emotion] || 0;
            const percentage = this.totalDetections > 0 ? (count / this.totalDetections * 100) : 0;
            
            const barElement = bar.querySelector('.bar');
            const percentageElement = bar.querySelector('.percentage');
            
            barElement.style.width = percentage + '%';
            percentageElement.textContent = percentage.toFixed(1) + '%';
            
            // Color coding based on emotion
            const colors = {
                happy: 'linear-gradient(90deg, #4CAF50, #45a049)',
                sad: 'linear-gradient(90deg, #2196F3, #1976D2)',
                angry: 'linear-gradient(90deg, #f44336, #d32f2f)',
                surprise: 'linear-gradient(90deg, #FF9800, #F57C00)',
                fear: 'linear-gradient(90deg, #9C27B0, #7B1FA2)',
                disgust: 'linear-gradient(90deg, #795548, #5D4037)',
                neutral: 'linear-gradient(90deg, #607D8B, #455A64)'
            };
            
            barElement.style.background = colors[emotion] || colors.neutral;
        });
    }

    getEmotionEmoji(emotion) {
        const emojis = {
            happy: '😊',
            sad: '😢',
            angry: '😠',
            surprise: '😲',
            fear: '😨',
            disgust: '🤢',
            neutral: '😐'
        };
        return emojis[emotion] || '🤔';
    }

    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };
        
        messageDiv.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(messageDiv);
        
        // Fade in
        setTimeout(() => messageDiv.style.opacity = '1', 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => document.body.removeChild(messageDiv), 300);
        }, 3000);
    }
}

// Initialize the emotion detector when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmotionDetector();
});