from flask import Flask, render_template, Response, jsonify
import cv2
import numpy as np
from tensorflow.keras.models import load_model
import base64
import io
from PIL import Image

app = Flask(__name__)

# Load the trained model
model = load_model('model/emotion_model.h5')

# Emotion labels (order must match training)
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Load Haar Cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

img_size = 48

class VideoCamera:
    def __init__(self):
        self.video = cv2.VideoCapture(0)
    
    def __del__(self):
        self.video.release()
    
    def get_frame(self):
        ret, frame = self.video.read()
        if not ret:
            return None
        
        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        emotions_detected = []
        
        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            roi_gray = cv2.resize(roi_gray, (img_size, img_size))
            roi = roi_gray.astype('float32') / 255.0
            roi = np.expand_dims(roi, axis=-1)
            roi = np.expand_dims(roi, axis=0)
            preds = model.predict(roi)
            emotion = emotion_labels[np.argmax(preds)]
            confidence = np.max(preds)
            
            emotions_detected.append({
                'emotion': emotion,
                'confidence': float(confidence),
                'bbox': [int(x), int(y), int(w), int(h)]
            })
            
            # Draw bounding box and label
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            label = f"{emotion} ({confidence*100:.1f}%)"
            cv2.putText(frame, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        return frame, emotions_detected

def gen_frames():
    camera = VideoCamera()
    while True:
        result = camera.get_frame()
        if result is None:
            break
        frame, _ = result
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/detect_emotion', methods=['POST'])
def detect_emotion():
    camera = VideoCamera()
    result = camera.get_frame()
    if result is None:
        return jsonify({'error': 'Could not capture frame'})
    
    _, emotions = result
    return jsonify({'emotions': emotions})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)