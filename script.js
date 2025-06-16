class WebcamApp {
    constructor() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('canvas');
        this.overlay = document.getElementById('overlay');
        this.photosContainer = document.getElementById('photos');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.toggleDetectionBtn = document.getElementById('toggleDetectionBtn');
        this.chaoticModeBtn = document.getElementById('chaoticModeBtn');
        this.faceCountElement = document.getElementById('faceCount');
        this.emotionDisplay = document.getElementById('emotionDisplay');
        this.loadingStatus = document.getElementById('loadingStatus');
        this.emojiOverlay = document.getElementById('emojiOverlay');
        
        this.stream = null;
        this.ctx = this.canvas.getContext('2d');
        this.overlayCtx = this.overlay.getContext('2d');
        this.isDetectionEnabled = false;
        this.isChaoticModeEnabled = false;
        this.detectionInterval = null;
        this.modelsLoaded = false;
        this.currentEmotion = 'neutral';
        this.lastEmotionChange = 0;
        this.chaosTimeout = null;
        
        this.initializeEventListeners();
        this.loadFaceDetectionModels();
        this.loadPhotosFromStorage();
    }

    async loadFaceDetectionModels() {
        try {
            this.loadingStatus.textContent = 'Loading face detection models...';
            
            // Load the models from local server
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            await faceapi.nets.faceExpressionNet.loadFromUri('/models');
            
            this.modelsLoaded = true;
            this.loadingStatus.textContent = 'AI models loaded successfully!';
            this.loadingStatus.className = 'status-indicator status-success';
            
            // Hide loading status after 3 seconds
            setTimeout(() => {
                this.loadingStatus.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('Error loading face detection models:', error);
            this.loadingStatus.textContent = 'Failed to load AI models';
            this.loadingStatus.className = 'status-indicator status-error';
        }
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.toggleDetectionBtn.addEventListener('click', () => this.toggleFaceDetection());
        this.chaoticModeBtn.addEventListener('click', () => this.toggleChaoticMode());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.video.srcObject = this.stream;
            
            // Wait for video to load and get dimensions
            this.video.addEventListener('loadedmetadata', () => {
                this.setupCanvas();
            });

            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.captureBtn.disabled = false;
            
            if (this.modelsLoaded) {
                this.toggleDetectionBtn.disabled = false;
                this.chaoticModeBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Unable to access camera. Please check permissions.');
        }
    }

    setupCanvas() {
        const videoRect = this.video.getBoundingClientRect();
        const containerRect = this.video.parentElement.getBoundingClientRect();
        
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Set overlay canvas dimensions and position
        this.overlay.width = this.video.videoWidth;
        this.overlay.height = this.video.videoHeight;
        
        // Calculate the actual displayed video dimensions
        const videoAspectRatio = this.video.videoWidth / this.video.videoHeight;
        const containerWidth = this.video.offsetWidth;
        const containerHeight = containerWidth / videoAspectRatio;
        
        this.overlay.style.width = containerWidth + 'px';
        this.overlay.style.height = containerHeight + 'px';
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.video.srcObject = null;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.captureBtn.disabled = true;
        this.toggleDetectionBtn.disabled = true;
        this.chaoticModeBtn.disabled = true;
        
        this.stopFaceDetection();
        this.stopChaoticMode();
        this.clearOverlay();
    }

    async toggleFaceDetection() {
        if (!this.modelsLoaded) {
            alert('Face detection models are still loading. Please wait.');
            return;
        }

        if (this.isDetectionEnabled) {
            this.stopFaceDetection();
        } else {
            this.startFaceDetection();
        }
    }

    startFaceDetection() {
        this.isDetectionEnabled = true;
        this.toggleDetectionBtn.textContent = '🤖 Disable AI Detection';
        this.toggleDetectionBtn.className = 'btn btn-danger';
        
        this.detectFaces();
    }

    stopFaceDetection() {
        this.isDetectionEnabled = false;
        this.toggleDetectionBtn.textContent = '🤖 Enable AI Detection';
        this.toggleDetectionBtn.className = 'btn btn-secondary';
        
        if (this.detectionInterval) {
            clearTimeout(this.detectionInterval);
        }
        
        this.clearOverlay();
        this.faceCountElement.textContent = 'Faces detected: 0';
    }

    async detectFaces() {
        if (!this.isDetectionEnabled || !this.video.videoWidth) {
            return;
        }

        try {
            const detections = await faceapi.detectAllFaces(
                this.video,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceExpressions();

            this.clearOverlay();
            this.drawDetections(detections);
            this.faceCountElement.textContent = `Faces detected: ${detections.length}`;

            // Process emotions for chaotic mode
            if (detections.length > 0 && this.isChaoticModeEnabled) {
                this.processEmotionsForChaos(detections);
            }

        } catch (error) {
            console.error('Face detection error:', error);
        }

        // Continue detection
        if (this.isDetectionEnabled) {
            this.detectionInterval = setTimeout(() => this.detectFaces(), 100);
        }
    }

    drawDetections(detections) {
        const displaySize = {
            width: this.video.videoWidth,
            height: this.video.videoHeight
        };

        // Clear the overlay
        this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);

        detections.forEach((detection, index) => {
            // Draw face box
            const box = detection.detection.box;
            this.overlayCtx.strokeStyle = '#00ff00';
            this.overlayCtx.lineWidth = 2;
            this.overlayCtx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw face landmarks
            if (detection.landmarks) {
                this.overlayCtx.fillStyle = '#ff0000';
                detection.landmarks.positions.forEach(point => {
                    this.overlayCtx.beginPath();
                    this.overlayCtx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
                    this.overlayCtx.fill();
                });
            }

            // Draw expression labels
            if (detection.expressions) {
                const expressions = detection.expressions;
                const maxExpression = Object.keys(expressions).reduce((a, b) => 
                    expressions[a] > expressions[b] ? a : b
                );
                
                if (expressions[maxExpression] > 0.5) {
                    this.overlayCtx.fillStyle = '#00ff00';
                    this.overlayCtx.font = '16px Arial';
                    this.overlayCtx.fillText(
                        `${maxExpression} (${Math.round(expressions[maxExpression] * 100)}%)`,
                        box.x,
                        box.y - 10
                    );
                }
            }

            // Draw face number
            this.overlayCtx.fillStyle = '#00ff00';
            this.overlayCtx.font = 'bold 20px Arial';
            this.overlayCtx.fillText(`Face ${index + 1}`, box.x, box.y + box.height + 20);
        });
    }

    clearOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }

    capturePhoto() {
        if (!this.stream) return;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        this.ctx.drawImage(this.video, 0, 0);
        
        // If face detection is enabled, also draw the detections on the photo
        if (this.isDetectionEnabled) {
            this.ctx.drawImage(this.overlay, 0, 0);
        }
        
        const dataURL = this.canvas.toDataURL('image/png');
        this.savePhoto(dataURL);
    }

    savePhoto(dataURL) {
        const timestamp = new Date().toISOString();
        const photo = {
            id: Date.now(),
            dataURL: dataURL,
            timestamp: timestamp
        };

        let photos = JSON.parse(localStorage.getItem('webcam-photos') || '[]');
        photos.unshift(photo);
        
        // Keep only the last 50 photos to prevent storage issues
        if (photos.length > 50) {
            photos = photos.slice(0, 50);
        }
        
        localStorage.setItem('webcam-photos', JSON.stringify(photos));
        this.displayPhotos();
    }

    loadPhotosFromStorage() {
        this.displayPhotos();
    }

    displayPhotos() {
        const photos = JSON.parse(localStorage.getItem('webcam-photos') || '[]');
        this.photosContainer.innerHTML = '';

        photos.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            this.photosContainer.appendChild(photoElement);
        });
    }

    createPhotoElement(photo) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-item';
        
        const img = document.createElement('img');
        img.src = photo.dataURL;
        img.alt = 'Captured photo';
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(photo.timestamp).toLocaleString();
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'photo-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-primary';
        downloadBtn.textContent = '⬇️ Download';
        downloadBtn.onclick = () => this.downloadPhoto(photo);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.onclick = () => this.deletePhoto(photo.id);
        
        actionsDiv.appendChild(downloadBtn);
        actionsDiv.appendChild(deleteBtn);
        
        photoDiv.appendChild(img);
        photoDiv.appendChild(timestamp);
        photoDiv.appendChild(actionsDiv);
        
        return photoDiv;
    }

    downloadPhoto(photo) {
        const link = document.createElement('a');
        link.download = `webcam-photo-${new Date(photo.timestamp).getTime()}.png`;
        link.href = photo.dataURL;
        link.click();
    }

    deletePhoto(photoId) {
        let photos = JSON.parse(localStorage.getItem('webcam-photos') || '[]');
        photos = photos.filter(photo => photo.id !== photoId);
        localStorage.setItem('webcam-photos', JSON.stringify(photos));
        this.displayPhotos();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Chaotic Mode Methods
    toggleChaoticMode() {
        if (this.isChaoticModeEnabled) {
            this.stopChaoticMode();
        } else {
            this.startChaoticMode();
        }
    }

    startChaoticMode() {
        if (!this.isDetectionEnabled) {
            alert('Please enable AI Detection first!');
            return;
        }

        this.isChaoticModeEnabled = true;
        this.chaoticModeBtn.textContent = '🎭 Disable Chaotic Mode';
        this.chaoticModeBtn.className = 'btn btn-danger';
        
        console.log('🎭 CHAOTIC MODE ACTIVATED! 🎭');
    }

    stopChaoticMode() {
        this.isChaoticModeEnabled = false;
        this.chaoticModeBtn.textContent = '🎭 Chaotic Mode';
        this.chaoticModeBtn.className = 'btn btn-secondary';
        
        // Clear all chaos effects
        this.clearChaosEffects();
        this.emotionDisplay.textContent = 'Current emotion: None';
        
        console.log('😌 Chaotic mode disabled. Peace restored.');
    }

    processEmotionsForChaos(detections) {
        // Get the strongest emotion from the first detected face
        const detection = detections[0];
        if (!detection.expressions) return;

        const expressions = detection.expressions;
        const maxExpression = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
        );

        const confidence = expressions[maxExpression];
        
        // Only trigger chaos if confidence is above threshold and emotion changed
        if (confidence > 0.6 && maxExpression !== this.currentEmotion) {
            this.currentEmotion = maxExpression;
            this.emotionDisplay.textContent = `Current emotion: ${maxExpression} (${Math.round(confidence * 100)}%)`;
            this.triggerChaos(maxExpression, confidence);
        }
    }

    triggerChaos(emotion, confidence) {
        console.log(`🎭 CHAOS TRIGGERED: ${emotion} (${Math.round(confidence * 100)}%)`);
        
        // Clear previous chaos
        this.clearChaosEffects();
        
        // Apply emotion-based chaos
        const container = document.querySelector('.container');
        const body = document.body;
        
        switch (emotion) {
            case 'angry':
                this.chaosAngry(container, body);
                break;
            case 'happy':
                this.chaosHappy(container, body);
                break;
            case 'surprised':
                this.chaosSurprised(container, body);
                break;
            case 'sad':
                this.chaosSad(container, body);
                break;
            case 'fearful':
                this.chaosFearful(container, body);
                break;
            case 'disgusted':
                this.chaosDisgusted(container, body);
                break;
            default:
                this.chaosNeutral(container, body);
        }

        // Auto-clear chaos after 3 seconds
        if (this.chaosTimeout) {
            clearTimeout(this.chaosTimeout);
        }
        this.chaosTimeout = setTimeout(() => {
            this.clearChaosEffects();
        }, 3000);
    }

    chaosAngry(container, body) {
        container.classList.add('chaos-angry');
        body.style.filter = 'contrast(1.5) saturate(1.5)';
        this.randomizeButtons('button-shake');
        this.spawnEmojis(['😡', '🔥', '💢', '😤'], 'red');
    }

    chaosHappy(container, body) {
        container.classList.add('chaos-happy');
        body.style.filter = 'brightness(1.2) saturate(1.5)';
        this.randomizeButtons('button-bounce');
        this.spawnEmojis(['😄', '🎉', '✨', '🌟', '🎊'], 'gold');
    }

    chaosSurprised(container, body) {
        container.classList.add('chaos-surprised');
        body.style.filter = 'brightness(1.5) contrast(1.3)';
        this.randomizeButtons('button-chaos');
        this.spawnEmojis(['😲', '🤯', '💥', '⚡'], 'yellow');
    }

    chaosSad(container, body) {
        container.classList.add('chaos-sad');
        body.style.filter = 'blur(1px) grayscale(0.3) brightness(0.8)';
        this.randomizeButtons('button-shake');
        this.spawnEmojis(['😢', '💧', '🌧️', '😭'], 'blue');
    }

    chaosFearful(container, body) {
        container.classList.add('chaos-fearful');
        body.style.filter = 'invert(0.1) sepia(0.3) hue-rotate(270deg)';
        this.randomizeButtons('button-shake');
        this.spawnEmojis(['😰', '👻', '🌙', '💀'], 'purple');
    }

    chaosDisgusted(container, body) {
        container.classList.add('chaos-disgusted');
        body.style.filter = 'hue-rotate(90deg) saturate(2) contrast(1.2)';
        this.randomizeButtons('button-chaos');
        this.spawnEmojis(['🤢', '🤮', '💚', '🐸'], 'green');
    }

    chaosNeutral(container, body) {
        container.classList.add('chaos-neutral');
        body.style.filter = 'grayscale(0.5)';
        this.spawnEmojis(['😐', '🤷', '💭'], 'gray');
    }

    randomizeButtons(animationClass) {
        const buttons = document.querySelectorAll('button:not(:disabled)');
        buttons.forEach(button => {
            button.classList.add(animationClass);
            
            // Randomly position some buttons
            if (Math.random() > 0.7) {
                const randomX = (Math.random() - 0.5) * 20;
                const randomY = (Math.random() - 0.5) * 20;
                const randomRotate = (Math.random() - 0.5) * 30;
                
                button.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;
            }
        });
    }

    spawnEmojis(emojiList, color) {
        const emojiCount = Math.floor(Math.random() * 8) + 5; // 5-12 emojis
        
        for (let i = 0; i < emojiCount; i++) {
            const emoji = document.createElement('div');
            emoji.className = 'floating-emoji';
            emoji.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
            
            // Random position
            emoji.style.left = Math.random() * 100 + 'vw';
            emoji.style.top = Math.random() * 100 + 'vh';
            
            // Random animation delay
            emoji.style.animationDelay = Math.random() * 2 + 's';
            
            // Add color glow effect
            emoji.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
            
            this.emojiOverlay.appendChild(emoji);
            
            // Remove emoji after animation
            setTimeout(() => {
                if (emoji.parentNode) {
                    emoji.parentNode.removeChild(emoji);
                }
            }, 3000);
        }
    }

    clearChaosEffects() {
        const container = document.querySelector('.container');
        const body = document.body;
        const buttons = document.querySelectorAll('button');
        
        // Remove all chaos classes
        container.classList.remove(
            'chaos-angry', 'chaos-happy', 'chaos-surprised', 
            'chaos-sad', 'chaos-fearful', 'chaos-disgusted', 'chaos-neutral'
        );
        
        // Reset body filters
        body.style.filter = '';
        
        // Reset buttons
        buttons.forEach(button => {
            button.classList.remove('button-chaos', 'button-bounce', 'button-shake');
            button.style.transform = '';
        });
        
        // Clear emojis
        this.emojiOverlay.innerHTML = '';
        
        // Clear timeout
        if (this.chaosTimeout) {
            clearTimeout(this.chaosTimeout);
            this.chaosTimeout = null;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebcamApp();
});