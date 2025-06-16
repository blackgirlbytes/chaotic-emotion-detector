# Webcam App with Face Detection

A sophisticated webcam application built with HTML, CSS, and JavaScript that combines live video streaming with real-time face detection using face-api.js.

## Features

### Core Webcam Features
- **Live Video Feed**: Real-time webcam display
- **Photo Capture**: Take snapshots from the video feed
- **Download Photos**: Save captured images as PNG files
- **Responsive Design**: Works on desktop and mobile devices

### Face Detection Features
- **Real-time Face Detection**: Detect faces in the live video stream
- **Face Landmarks**: 68-point facial landmark detection
- **Advanced Emotion Analysis**: Comprehensive emotion recognition and tracking
- **Age & Gender Estimation**: Estimate age and gender with confidence scores
- **Visual Overlays**: Draw bounding boxes and landmarks on detected faces
- **Detection Statistics**: Display detailed information about detected faces

### Emotion Analysis Features
- **Real-time Emotion Detection**: Analyze emotions as they happen
- **Dominant Emotion Display**: Large visual display of primary emotion with emoji
- **Emotion Progress Bars**: Visual representation of all detected emotions
- **Emotion Timeline**: Historical tracking of emotion changes over time
- **Emotion Data Export**: Download detailed JSON reports of emotion analysis
- **Photo Emotion Tagging**: Capture photos with current emotion metadata
- **Emotion Insights**: Statistical analysis of emotion patterns

## Technologies Used

- **HTML5**: Structure and video elements
- **CSS3**: Styling and responsive design
- **JavaScript (ES6+)**: Core functionality and async operations
- **WebRTC**: Camera access via getUserMedia API
- **face-api.js**: Machine learning-powered face detection and analysis
- **Canvas API**: Image processing and overlay rendering

## Browser Requirements

- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 12+

**Note**: Face detection requires additional processing power and may perform better on desktop browsers.

## Security Requirements

This app requires HTTPS to work in production environments due to browser security restrictions for camera access. For local development, it works with HTTP on localhost.

## Usage

1. **Start the Application**: Open in a web browser
2. **Initialize Camera**: Click "Start Camera" to begin the video feed
3. **Enable Face Detection**: Toggle the face detection switch to activate AI features
4. **View Real-time Analysis**: 
   - See live emotion analysis with dominant emotion display
   - Watch emotion progress bars update in real-time
   - Monitor emotion timeline for historical tracking
5. **Capture Emotion-Tagged Photos**: Click "Take Photo" to capture snapshots with current emotion data
6. **Export Emotion Data**: Click "Export Emotion Data" to download detailed analysis reports
7. **Download Images**: Click "Download" on any captured photo to save it
8. **Stop Camera**: Click "Stop Camera" when finished

## Emotion Analysis Capabilities

### Real-time Features
- **Dominant Emotion**: Large display showing primary detected emotion with emoji and confidence
- **All Emotions Bar Chart**: Visual progress bars for all 7 emotions with percentages
- **Live Timeline**: Scrolling history of recent emotion detections with timestamps
- **Confidence Scoring**: Accuracy percentages for each emotion detection

### Data Export Features
- **JSON Export**: Comprehensive emotion data in structured format
- **Session Summary**: Statistical analysis including most frequent emotions
- **Confidence Analytics**: Average, minimum, and maximum confidence scores
- **Timeline Data**: Complete chronological record of all detections

### Photo Integration
- **Emotion Metadata**: Photos include current emotion state when captured
- **Visual Overlays**: Option to include face detection boxes and landmarks
- **Timestamped Data**: Each photo tagged with exact emotion and time

## Face Detection Capabilities

### What Gets Detected
- **Face Bounding Boxes**: Green rectangles around detected faces
- **Facial Landmarks**: 68 key points on each face (eyes, nose, mouth, jawline)
- **Age Estimation**: Approximate age in years
- **Gender Classification**: Male/Female with confidence percentage
- **Facial Expressions**: Dominant emotion with confidence score
- **Detection Confidence**: Accuracy of face detection

### Supported Expressions
- Happy
- Sad
- Angry
- Fearful
- Disgusted
- Surprised
- Neutral

## File Structure

```
webcam-app/
├── index.html          # Main HTML file with UI
├── script.js           # JavaScript functionality
├── models/             # Face detection model files
│   ├── tiny_face_detector_model-weights_manifest.json
│   ├── tiny_face_detector_model-shard1
│   ├── face_landmark_68_model-weights_manifest.json
│   └── face_landmark_68_model-shard1
└── README.md           # This documentation
```

## Performance Notes

- Face detection runs at ~10 FPS for optimal performance
- Local model files provide faster loading than CDN
- Detection accuracy improves with good lighting
- Multiple faces can be detected simultaneously
- Performance varies based on device capabilities

## Privacy & Data

- All processing happens locally in the browser
- No video or image data is sent to external servers
- Face detection models are loaded once and cached
- Photos are only saved when explicitly downloaded by the user

## How to Run

See the command below to start a local server and access the app.