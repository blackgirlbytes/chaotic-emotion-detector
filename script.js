class WebcamApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.statusDiv = document.getElementById('status');
        this.errorDiv = document.getElementById('error');
        this.photosDiv = document.getElementById('photos');
        this.faceDetectionToggle = document.getElementById('faceDetectionToggle');
        this.detectionInfo = document.getElementById('detectionInfo');
        this.emotionAnalysis = document.getElementById('emotionAnalysis');
        this.dominantEmotion = document.getElementById('dominantEmotion');
        this.emotionBars = document.getElementById('emotionBars');
        this.emotionHistory = document.getElementById('emotionHistory');
        this.emotionTimeline = document.getElementById('emotionTimeline');
        this.exportEmotionBtn = document.getElementById('exportEmotionBtn');
        
        this.stream = null;
        this.photoCount = 0;
        this.faceDetectionEnabled = false;
        this.modelsLoaded = false;
        this.detectionInterval = null;
        this.emotionHistoryData = [];
        this.maxHistoryLength = 20;
        
        // Emotion configuration
        this.emotionEmojis = {
            happy: '😊',
            sad: '😢',
            angry: '😠',
            fearful: '😨',
            disgusted: '🤢',
            surprised: '😲',
            neutral: '😐'
        };
        
        this.emotionColors = {
            happy: '#28a745',
            sad: '#007bff',
            angry: '#dc3545',
            fearful: '#6f42c1',
            disgusted: '#20c997',
            surprised: '#ffc107',
            neutral: '#6c757d'
        };
        
        this.initEventListeners();
        this.loadFaceApiModels();
        this.debugDOMElements();
    }

    debugDOMElements() {
        console.log('DOM Elements Check:');
        console.log('emotionAnalysis:', this.emotionAnalysis);
        console.log('dominantEmotion:', this.dominantEmotion);
        console.log('emotionBars:', this.emotionBars);
        console.log('emotionHistory:', this.emotionHistory);
        console.log('emotionTimeline:', this.emotionTimeline);
    }

    async loadFaceApiModels() {
        try {
            this.showStatus('Loading face detection models...', 'info');
            
            // Load face-api.js models from local files for better performance
            await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
            
            // Load expression model from CDN (essential for emotion analysis)
            console.log('Loading expression model...');
            await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
            console.log('Expression model loaded successfully');
            
            // Try to load additional models, but don't fail if they're not available
            try {
                await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                await faceapi.nets.ageGenderNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
                console.log('Additional models loaded');
            } catch (extraError) {
                console.warn('Some advanced models failed to load:', extraError);
            }
            
            this.modelsLoaded = true;
            this.showStatus('Face detection and emotion models loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error loading face-api models:', error);
            this.showError('Failed to load face detection models. Face detection will be disabled.');
        }
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.faceDetectionToggle.addEventListener('change', (e) => this.toggleFaceDetection(e.target.checked));
        this.exportEmotionBtn.addEventListener('click', () => this.exportEmotionData());
        
        // Resize overlay when video loads
        this.video.addEventListener('loadedmetadata', () => {
            this.resizeOverlay();
        });
    }

    resizeOverlay() {
        const rect = this.video.getBoundingClientRect();
        this.overlay.width = this.video.videoWidth;
        this.overlay.height = this.video.videoHeight;
        this.overlay.style.width = rect.width + 'px';
        this.overlay.style.height = rect.height + 'px';
    }

    async startCamera() {
        try {
            this.showStatus('Requesting camera access...', 'info');
            
            // Request access to the camera
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user' // Use front camera by default
                },
                audio: false
            });

            // Set the video source to the camera stream
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });
            
            this.resizeOverlay();
            
            // Update UI
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.captureBtn.disabled = false;
            this.exportEmotionBtn.disabled = false;
            
            this.showStatus('Camera started successfully!', 'success');
            this.hideError();
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError(this.getErrorMessage(error));
            this.showStatus('Failed to start camera', 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            // Stop all tracks in the stream
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clear the video source
        this.video.srcObject = null;
        
        // Stop face detection
        this.stopFaceDetection();
        
        // Update UI
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.captureBtn.disabled = true;
        this.exportEmotionBtn.disabled = true;
        this.faceDetectionToggle.checked = false;
        
        this.showStatus('Camera stopped', 'info');
    }

    toggleFaceDetection(enabled) {
        if (!this.modelsLoaded) {
            this.showError('Face detection models are not loaded yet');
            this.faceDetectionToggle.checked = false;
            return;
        }

        if (!this.stream) {
            this.showError('Please start the camera first');
            this.faceDetectionToggle.checked = false;
            return;
        }

        this.faceDetectionEnabled = enabled;
        
        if (enabled) {
            this.startFaceDetection();
        } else {
            this.stopFaceDetection();
        }
    }

    startFaceDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }

        this.detectionInfo.style.display = 'block';
        this.emotionAnalysis.style.display = 'block';
        this.showStatus('Face detection and emotion analysis enabled', 'success');

        // Run face detection every 100ms
        this.detectionInterval = setInterval(async () => {
            await this.detectFaces();
        }, 100);
    }

    stopFaceDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Clear overlay
        const ctx = this.overlay.getContext('2d');
        ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        
        this.detectionInfo.style.display = 'none';
        this.emotionAnalysis.style.display = 'none';
        this.faceDetectionEnabled = false;
        
        // Clear emotion history
        this.emotionHistoryData = [];
    }

    async detectFaces() {
        if (!this.video || this.video.paused || this.video.ended) {
            return;
        }

        try {
            // Always try to get expressions if the model is loaded
            let detections;
            
            if (faceapi.nets.faceExpressionNet.isLoaded) {
                console.log('Detecting with expressions...');
                detections = await faceapi
                    .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceExpressions();
                    
                // Add age/gender if available
                if (faceapi.nets.ageGenderNet.isLoaded) {
                    detections = await faceapi
                        .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceExpressions()
                        .withAgeAndGender();
                }
            } else {
                console.log('Expression model not loaded, basic detection only');
                detections = await faceapi
                    .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();
            }

            // Clear previous drawings
            const ctx = this.overlay.getContext('2d');
            ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

            if (detections.length > 0) {
                console.log('Detections found:', detections.length);
                
                // Resize detections to match display size
                const resizedDetections = faceapi.resizeResults(detections, {
                    width: this.video.videoWidth,
                    height: this.video.videoHeight
                });

                // Draw face detection boxes and landmarks
                this.drawDetections(ctx, resizedDetections);
                
                // Update detection info
                this.updateDetectionInfo(detections);
                
                // Update emotion analysis
                this.updateEmotionAnalysis(detections);
            } else {
                this.detectionInfo.innerHTML = '<strong>No faces detected</strong>';
                this.clearEmotionAnalysis();
            }

        } catch (error) {
            console.error('Face detection error:', error);
        }
    }

    drawDetections(ctx, detections) {
        detections.forEach((detection, index) => {
            const { box } = detection.detection;
            
            // Draw bounding box
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw face number
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            ctx.fillText(`Face ${index + 1}`, box.x, box.y - 5);
            
            // Draw landmarks
            if (detection.landmarks) {
                ctx.fillStyle = '#ff0000';
                detection.landmarks.positions.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        });
    }

    updateDetectionInfo(detections) {
        let infoHtml = `<strong>Faces detected: ${detections.length}</strong><br><br>`;
        
        detections.forEach((detection, index) => {
            infoHtml += `<div style="margin-bottom: 10px; padding: 5px; border-left: 3px solid #007bff;">
                <strong>Face ${index + 1}:</strong><br>`;
            
            // Show age and gender if available
            if (detection.age && detection.gender) {
                const { age, gender, genderProbability } = detection;
                infoHtml += `Age: ~${Math.round(age)} years<br>
                            Gender: ${gender} (${Math.round(genderProbability * 100)}% confidence)<br>`;
            }
            
            // Show expressions if available
            if (detection.expressions) {
                const expressions = detection.expressions;
                const topExpression = Object.keys(expressions).reduce((a, b) => 
                    expressions[a] > expressions[b] ? a : b
                );
                infoHtml += `Expression: ${topExpression} (${Math.round(expressions[topExpression] * 100)}%)<br>`;
            }
            
            // Show detection confidence
            if (detection.detection && detection.detection.score) {
                infoHtml += `Detection confidence: ${Math.round(detection.detection.score * 100)}%`;
            }
            
            infoHtml += `</div>`;
        });
        
        this.detectionInfo.innerHTML = infoHtml;
    }

    updateEmotionAnalysis(detections) {
        if (!detections || detections.length === 0) {
            this.clearEmotionAnalysis();
            return;
        }

        // Focus on the first detected face for emotion analysis
        const detection = detections[0];
        
        if (!detection.expressions) {
            console.log('No expressions found in detection');
            this.clearEmotionAnalysis();
            return;
        }

        console.log('Expressions detected:', detection.expressions);
        const expressions = detection.expressions;
        
        // Find dominant emotion
        const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
        );
        
        console.log('Dominant emotion:', dominantEmotion, expressions[dominantEmotion]);
        
        // Update dominant emotion display
        this.updateDominantEmotion(dominantEmotion, expressions[dominantEmotion]);
        
        // Update emotion bars
        this.updateEmotionBars(expressions);
        
        // Add to emotion history
        this.addToEmotionHistory(dominantEmotion, expressions[dominantEmotion]);
    }

    updateDominantEmotion(emotion, confidence) {
        if (!this.dominantEmotion) {
            console.error('dominantEmotion element not found');
            return;
        }
        
        const emoji = this.emotionEmojis[emotion] || '🤔';
        const color = this.emotionColors[emotion] || '#6c757d';
        
        this.dominantEmotion.innerHTML = `
            <h3 style="color: ${color};">Dominant Emotion</h3>
            <div class="emotion-emoji">${emoji}</div>
            <div style="font-size: 18px; font-weight: bold; text-transform: capitalize;">
                ${emotion}
            </div>
            <div style="font-size: 14px; color: #666;">
                ${Math.round(confidence * 100)}% confidence
            </div>
        `;
        this.dominantEmotion.style.display = 'block';
        this.dominantEmotion.style.borderColor = color;
    }

    updateEmotionBars(expressions) {
        if (!this.emotionBars) {
            console.error('emotionBars element not found');
            return;
        }
        
        const sortedEmotions = Object.entries(expressions)
            .sort(([,a], [,b]) => b - a);
        
        let barsHtml = '<h4>All Emotions</h4>';
        
        sortedEmotions.forEach(([emotion, confidence]) => {
            const percentage = Math.round(confidence * 100);
            const color = this.emotionColors[emotion] || '#6c757d';
            const emoji = this.emotionEmojis[emotion] || '🤔';
            
            barsHtml += `
                <div class="emotion-bar">
                    <div class="emotion-label">${emoji} ${emotion}</div>
                    <div class="emotion-progress">
                        <div class="emotion-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                    </div>
                    <div class="emotion-percentage">${percentage}%</div>
                </div>
            `;
        });
        
        this.emotionBars.innerHTML = barsHtml;
    }

    addToEmotionHistory(emotion, confidence) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            emotion,
            confidence: Math.round(confidence * 100),
            timestamp,
            emoji: this.emotionEmojis[emotion] || '🤔'
        };
        
        // Add to history array
        if (!this.emotionHistoryData) {
            this.emotionHistoryData = [];
        }
        
        this.emotionHistoryData.unshift(entry);
        
        // Keep only recent entries
        if (this.emotionHistoryData.length > this.maxHistoryLength) {
            this.emotionHistoryData = this.emotionHistoryData.slice(0, this.maxHistoryLength);
        }
        
        // Update timeline display
        this.updateEmotionTimeline();
    }

    updateEmotionTimeline() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length === 0) {
            this.emotionHistory.style.display = 'none';
            return;
        }
        
        this.emotionHistory.style.display = 'block';
        
        let timelineHtml = '';
        this.emotionHistoryData.slice(0, 10).forEach((entry, index) => {
            const opacity = 1 - (index * 0.1);
            timelineHtml += `
                <div style="opacity: ${opacity}; margin: 5px 0; padding: 5px; background-color: rgba(0,0,0,0.05); border-radius: 4px;">
                    <strong>${entry.emoji} ${entry.emotion}</strong> 
                    (${entry.confidence}%) - ${entry.timestamp}
                </div>
            `;
        });
        
        this.emotionTimeline.innerHTML = timelineHtml;
    }

    clearEmotionAnalysis() {
        if (this.dominantEmotion) {
            this.dominantEmotion.style.display = 'none';
        }
        if (this.emotionBars) {
            this.emotionBars.innerHTML = '<h4>No emotions detected</h4>';
        }
        if (this.emotionHistory) {
            this.emotionHistory.style.display = 'none';
        }
    }

    getEmotionInsights() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length < 5) {
            return null;
        }
        
        // Analyze emotion patterns
        const emotionCounts = {};
        this.emotionHistoryData.forEach(entry => {
            emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
        });
        
        const mostFrequent = Object.keys(emotionCounts).reduce((a, b) => 
            emotionCounts[a] > emotionCounts[b] ? a : b
        );
        
        return {
            mostFrequentEmotion: mostFrequent,
            emotionVariety: Object.keys(emotionCounts).length,
            totalReadings: this.emotionHistoryData.length
        };
    }

    exportEmotionData() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length === 0) {
            this.showError('No emotion data to export');
            return;
        }

        const insights = this.getEmotionInsights();
        const exportData = {
            sessionInfo: {
                exportDate: new Date().toISOString(),
                totalReadings: this.emotionHistoryData.length,
                sessionDuration: this.getSessionDuration(),
                insights: insights
            },
            emotionHistory: this.emotionHistoryData,
            summary: this.generateEmotionSummary()
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `emotion-analysis-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showStatus('Emotion data exported successfully!', 'success');
    }

    generateEmotionSummary() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length === 0) {
            return null;
        }

        const emotionCounts = {};
        const emotionConfidences = {};
        
        this.emotionHistoryData.forEach(entry => {
            emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
            if (!emotionConfidences[entry.emotion]) {
                emotionConfidences[entry.emotion] = [];
            }
            emotionConfidences[entry.emotion].push(entry.confidence);
        });

        const summary = {};
        Object.keys(emotionCounts).forEach(emotion => {
            const confidences = emotionConfidences[emotion];
            summary[emotion] = {
                count: emotionCounts[emotion],
                percentage: Math.round((emotionCounts[emotion] / this.emotionHistoryData.length) * 100),
                averageConfidence: Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length),
                maxConfidence: Math.max(...confidences),
                minConfidence: Math.min(...confidences)
            };
        });

        return summary;
    }

    getSessionDuration() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length < 2) {
            return 'Unknown';
        }
        
        const firstEntry = this.emotionHistoryData[this.emotionHistoryData.length - 1];
        const lastEntry = this.emotionHistoryData[0];
        
        // Simple duration calculation (this is approximate)
        return `~${this.emotionHistoryData.length * 0.1} seconds`;
    }

    capturePhoto() {
        if (!this.stream) {
            this.showError('Camera is not active');
            return;
        }

        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw the current video frame to the canvas
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        // If face detection is enabled, also draw the overlay
        if (this.faceDetectionEnabled) {
            ctx.drawImage(this.overlay, 0, 0);
        }

        // Convert canvas to image data URL
        const imageDataUrl = this.canvas.toDataURL('image/png');
        
        // Get current emotion data if available
        const currentEmotion = this.getCurrentEmotionData();
        
        // Create and display the photo
        this.displayPhoto(imageDataUrl, currentEmotion);
        
        this.photoCount++;
        this.showStatus(`Photo captured! (${this.photoCount} total)`, 'success');
    }

    getCurrentEmotionData() {
        if (!this.emotionHistoryData || this.emotionHistoryData.length === 0) {
            return null;
        }
        
        return this.emotionHistoryData[0]; // Most recent emotion
    }

    displayPhoto(imageDataUrl, emotionData = null) {
        const photoDiv = document.createElement('div');
        photoDiv.style.cssText = `
            display: inline-block;
            margin: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            max-width: 250px;
        `;

        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.style.cssText = `
            max-width: 200px;
            height: auto;
            border-radius: 4px;
        `;

        // Add emotion info if available
        let emotionInfo = '';
        if (emotionData) {
            emotionInfo = `
                <div style="margin: 10px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px; font-size: 12px;">
                    <strong>📊 Emotion at capture:</strong><br>
                    ${emotionData.emoji} ${emotionData.emotion} (${emotionData.confidence}%)<br>
                    <small>Time: ${emotionData.timestamp}</small>
                </div>
            `;
        }

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.style.cssText = `
            display: block;
            margin: 10px auto 0;
            padding: 5px 10px;
            font-size: 12px;
        `;
        
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `webcam-photo-${Date.now()}.png`;
            link.href = imageDataUrl;
            link.click();
        });

        photoDiv.innerHTML = emotionInfo;
        photoDiv.appendChild(img);
        photoDiv.appendChild(downloadBtn);
        this.photosDiv.appendChild(photoDiv);
    }

    showStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
        this.statusDiv.style.display = 'block';
    }

    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    hideError() {
        this.errorDiv.style.display = 'none';
    }

    getErrorMessage(error) {
        switch (error.name) {
            case 'NotAllowedError':
                return 'Camera access was denied. Please allow camera permissions and try again.';
            case 'NotFoundError':
                return 'No camera found on this device.';
            case 'NotSupportedError':
                return 'Camera is not supported on this device.';
            case 'NotReadableError':
                return 'Camera is already in use by another application.';
            case 'OverconstrainedError':
                return 'Camera constraints could not be satisfied.';
            case 'SecurityError':
                return 'Camera access blocked due to security restrictions.';
            default:
                return `Camera error: ${error.message || 'Unknown error occurred'}`;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if the browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('error').textContent = 
            'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.';
        document.getElementById('error').style.display = 'block';
        return;
    }

    // Check if face-api.js is loaded
    if (typeof faceapi === 'undefined') {
        document.getElementById('error').textContent = 
            'Face detection library failed to load. Please check your internet connection.';
        document.getElementById('error').style.display = 'block';
        return;
    }

    new WebcamApp();
});

// Handle page visibility changes to manage camera resources
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Optionally pause face detection when tab is not visible
        console.log('Page hidden - pausing face detection');
    } else {
        console.log('Page visible - resuming face detection');
    }
});