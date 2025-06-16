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
        this.faceCountElement = document.getElementById('faceCount');
        this.loadingStatus = document.getElementById('loadingStatus');
        
        this.stream = null;
        this.ctx = this.canvas.getContext('2d');
        this.overlayCtx = this.overlay.getContext('2d');
        this.isDetectionEnabled = false;
        this.detectionInterval = null;
        this.modelsLoaded = false;
        
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
            this.loadingStatus.textContent = 'Face detection models loaded successfully!';
            this.loadingStatus.style.color = '#28a745';
            
            // Hide loading status after 3 seconds
            setTimeout(() => {
                this.loadingStatus.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('Error loading face detection models:', error);
            this.loadingStatus.textContent = 'Failed to load face detection models. Check console for details.';
            this.loadingStatus.style.color = '#dc3545';
        }
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.toggleDetectionBtn.addEventListener('click', () => this.toggleFaceDetection());
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
        
        this.stopFaceDetection();
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
        this.toggleDetectionBtn.textContent = 'Disable Face Detection';
        this.toggleDetectionBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        
        this.detectFaces();
    }

    stopFaceDetection() {
        this.isDetectionEnabled = false;
        this.toggleDetectionBtn.textContent = 'Enable Face Detection';
        this.toggleDetectionBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        
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
        
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => this.downloadPhoto(photo);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        deleteBtn.onclick = () => this.deletePhoto(photo.id);
        
        photoDiv.appendChild(img);
        photoDiv.appendChild(timestamp);
        photoDiv.appendChild(downloadBtn);
        photoDiv.appendChild(deleteBtn);
        
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebcamApp();
});