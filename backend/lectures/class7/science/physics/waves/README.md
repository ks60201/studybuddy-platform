# Class 7 Science Physics Waves Level 1 API

This API provides endpoints for the Class 7 Physics Waves Level 1 lecture with full TTS and audio streaming capabilities.

## Base URL

```
http://localhost:8000/api/lectures/class7/science/physics/waves/level1
```

## Available Endpoints

### 1. Get API Information

- **GET** `/`
- Returns information about available endpoints

### 2. Start Lecture

- **POST** `/start-lecture`
- Starts the physics lecture with TTS and audio streaming
- **Request Body:**

```json
{
  "gemini_api_key": "your_api_key",
  "gemini_url": "your_gemini_url"
}
```

### 3. Stop Lecture

- **POST** `/stop-lecture`
- Stops the currently running lecture

### 4. Get Lecture Status

- **GET** `/status`
- Returns current lecture status (running/stopped)

### 5. Change Voice Type

- **POST** `/change-voice`
- Changes the TTS voice type
- **Request Body:**

```json
{
  "voice_type": "female" // or "male"
}
```

### 6. Enable Q&A Sessions

- **POST** `/enable-qa`
- Enables Q&A sessions during lecture

### 7. Disable Q&A Sessions

- **POST** `/disable-qa`
- Disables Q&A sessions during lecture

### 8. List Available Voices

- **GET** `/list-voices`
- Lists all available TTS voice models

### 9. Generate Text with Gemini

- **POST** `/generate-text`
- Generates text using Gemini AI
- **Request Body:**

```json
{
  "prompt": "Your text generation prompt"
}
```

### 10. Synthesize and Stream Text

- **POST** `/synthesize-text`
- Synthesizes text to speech and streams audio
- **Request Body:**

```json
{
  "text": "Text to synthesize and stream"
}
```

### 11. Submit Q&A Response

- **POST** `/qa-response`
- Submits Q&A response from frontend
- **Request Body:**

```json
{
  "response": "User's response"
}
```

## Test the API

```bash
# Get API information
curl http://localhost:8000/api/lectures/class7/science/physics/waves/level1/

# Start lecture
curl -X POST http://localhost:8000/api/lectures/class7/science/physics/waves/level1/start-lecture \
  -H "Content-Type: application/json" \
  -d '{"gemini_api_key": "your_key"}'

# Check status
curl http://localhost:8000/api/lectures/class7/science/physics/waves/level1/status

# Change voice
curl -X POST http://localhost:8000/api/lectures/class7/science/physics/waves/level1/change-voice \
  -H "Content-Type: application/json" \
  -d '{"voice_type": "female"}'

# Enable Q&A
curl -X POST http://localhost:8000/api/lectures/class7/science/physics/waves/level1/enable-qa

# Generate text
curl -X POST http://localhost:8000/api/lectures/class7/science/physics/waves/level1/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain waves in simple terms"}'
```

## Features

- ✅ Full TTS (Text-to-Speech) integration
- ✅ Audio streaming capabilities
- ✅ Gemini AI text generation
- ✅ Voice customization (male/female)
- ✅ Q&A session support
- ✅ Real-time lecture delivery
- ✅ Threaded audio processing
- ✅ WebSocket support for real-time communication

## Dependencies

The API requires the following dependencies (already added to requirements.txt):

- torch
- numpy
- pyaudio
- TTS
- Pillow
- requests
- flask
- flask-cors
- flask-socketio

## Notes

- The lecture runs in a separate thread to avoid blocking the API
- Audio streaming is handled asynchronously
- Q&A responses can be submitted via the `/qa-response` endpoint
- All original functionality from your `level1.py` is preserved
