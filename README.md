# Webcam App with Face Detection

A modern, responsive webcam application built with vanilla JavaScript, HTML, and CSS. This app allows users to access their camera, take photos, manage captured images, and detect faces in real-time using Face-API.js.

## Features

- 🎥 **Camera Access**: Start and stop webcam feed
- 📸 **Photo Capture**: Take photos with a single click
- 👤 **Face Detection**: Real-time face detection with landmarks and expressions
- 🎭 **Expression Recognition**: Detect emotions (happy, sad, angry, surprised, etc.)
- 📊 **Face Count**: Display number of detected faces
- 🎯 **Visual Overlays**: Green bounding boxes and facial landmarks
- 💾 **Local Storage**: Photos are saved locally in the browser
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Clean, gradient-based design
- ⬇️ **Download Photos**: Save captured photos to device
- 🗑️ **Delete Photos**: Remove unwanted photos
- 🔒 **Privacy Focused**: All data stays on your device

## Getting Started

### Prerequisites

- Node.js (version 12 or higher)
- A modern web browser with camera support
- Camera/webcam connected to your device

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Run the server using one of the commands below

### Running the Server

```bash
# Option 1: Using npm
npm start

# Option 2: Using node directly
node server.js
```

The server will start on `http://localhost:3000`

### Usage

1. Open your browser and go to `http://localhost:3000`
2. Click "Start Camera" to begin webcam feed
3. Allow camera permissions when prompted
4. Click "Enable Face Detection" to start real-time face detection
5. Watch as faces are detected with green bounding boxes and landmarks
6. View face count and dominant expressions displayed
7. Click "Take Photo" to capture images (with or without face detection overlays)
8. Use "Download" to save photos or "Delete" to remove them
9. Click "Stop Camera" when finished

## Face Detection Features

### Real-time Detection
- Detects multiple faces simultaneously
- Shows bounding boxes around detected faces
- Displays facial landmarks (68 points)
- Updates face count in real-time

### Expression Recognition
- Recognizes 7 basic emotions: happy, sad, angry, fearful, disgusted, surprised, neutral
- Shows the dominant expression with confidence percentage
- Only displays expressions with >50% confidence

### Visual Indicators
- **Green boxes**: Face detection boundaries
- **Red dots**: Facial landmark points
- **Green text**: Face numbers and expressions
- **Face counter**: Total number of detected faces

## Technical Details

### Face Detection Models
The app uses Face-API.js with the following pre-trained models (served locally):
- **TinyFaceDetector**: Lightweight face detection
- **FaceLandmark68Net**: 68-point facial landmark detection
- **FaceExpressionNet**: Emotion/expression recognition
- **FaceRecognitionNet**: Face feature extraction

Models are downloaded and served from the `/models/` directory for better performance and reliability.

### Performance
- Detection runs at ~10 FPS for smooth real-time experience
- Models are loaded from local server for faster initialization
- Optimized for both desktop and mobile devices

## Browser Compatibility

This app works with modern browsers that support:
- `getUserMedia()` API
- HTML5 Canvas
- ES6+ JavaScript features
- WebGL (for Face-API.js models)

### Supported Browsers:
- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 12+

**Note**: Face detection requires additional processing power and may perform better on desktop devices.

## Security Notes

- The app requires HTTPS in production for camera access
- For local development, `localhost` is allowed over HTTP
- All photos are stored locally in browser storage
- Face detection models are loaded from CDN
- No facial data or photos are sent to external servers
- All processing happens locally in the browser

## File Structure

```
webcam-app/
├── index.html          # Main HTML file
├── style.css           # Styles and responsive design
├── script.js           # JavaScript functionality
├── server.js           # Simple HTTP server
├── package.json        # Project configuration
├── models/             # Face detection model files
│   ├── tiny_face_detector_model-*
│   ├── face_landmark_68_model-*
│   ├── face_expression_model-*
│   └── face_recognition_model-*
└── README.md          # This file
```

## Customization

### Changing Camera Settings

Edit the `getUserMedia()` constraints in `script.js`:

```javascript
this.stream = await navigator.mediaDevices.getUserMedia({
    video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user' // or 'environment' for rear camera
    },
    audio: false
});
```

### Face Detection Settings

Modify detection options in `script.js`:

```javascript
// Change detection model options
new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,        // 160, 224, 320, 416, 512, 608
    scoreThreshold: 0.5    // 0.1 - 0.9
})

// Adjust detection frequency (milliseconds)
setTimeout(() => this.detectFaces(), 100); // Change 100 to desired interval
```

### Expression Confidence Threshold

Change the minimum confidence for displaying expressions:

```javascript
if (expressions[maxExpression] > 0.5) { // Change 0.5 to desired threshold
    // Display expression
}
```

### Styling

Modify `style.css` to change colors, layout, or responsive breakpoints.

### Server Port

Change the port in `server.js`:

```javascript
const port = 3000; // Change this to your preferred port
```

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if another application is using the camera
- Try refreshing the page
- Verify camera is properly connected

### Face Detection Not Working
- Wait for models to finish loading (check loading status)
- Ensure good lighting conditions
- Make sure face is clearly visible and facing camera
- Try refreshing the page if detection stops working

### Performance Issues
- Close other browser tabs using camera/microphone
- Reduce detection frequency by increasing timeout interval
- Use lower camera resolution
- Try on a device with better processing power

### HTTPS Required Error
- Use `localhost` for development
- Deploy with HTTPS for production use

### Storage Issues
- Clear browser storage if photos aren't saving
- Check available storage space
- Ensure JavaScript is enabled

### Model Loading Errors
- Check internet connection (models load from local server)
- Ensure server is running on http://localhost:3000
- Try refreshing the page
- Verify browser supports WebGL
- Check browser console for detailed error messages

## License

MIT License - feel free to use and modify as needed.

## Contributing

Feel free to submit issues and pull requests to improve the application.