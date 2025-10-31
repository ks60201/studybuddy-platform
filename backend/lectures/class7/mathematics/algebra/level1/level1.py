import torch
import numpy as np
import pyaudio
import threading
import queue
import time
import requests
import json
from TTS.api import TTS
import re
import signal
import os
from PIL import Image
from datetime import datetime, timedelta
import jwt
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from auth import get_current_user_token, TokenData, get_current_user_data
from config import supabase, supabase_service, SECRET_KEY, ALGORITHM
import logging
# 🧱 Import the revolutionary Math Wall
from .math_wall_algebra import MathWallAlgebra

# 🎭 Import the revolutionary Emotion Detector
from .emotion_detector import EmotionDetector

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lectures/class7/mathematics/algebra/level1", tags=["mathematics-lecture"])

class AlgebraLectureStreamer:
    def __init__(self, gemini_api_key=None, gemini_url=None):
        # Try to use GPU for faster processing
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🚀 Using device: {device}")
        
        # 🧱 Initialize the revolutionary Math Wall for Algebra
        self.math_wall = MathWallAlgebra()
        print("🧱 Math Wall for Algebra initialized - Revolutionary TTS preprocessing ready!")
        
        # 🎭 Initialize the revolutionary Emotion Detector
        self.emotion_detector = EmotionDetector()
        print("🎭 Emotion Detector initialized - Personalized Q&A responses ready!")
        
        # 🎤 Initialize emotion-aware TTS settings
        self.current_emotion = "neutral"  # Track current emotion for TTS modulation
        self.emotion_tts_settings = {
            "curious": {
                "speed": 2.2,  # Faster, excited pace
                "description": "Fast & Enthusiastic"
            },
            "simple": {
                "speed": 2.0,  # Normal, clear pace
                "description": "Clear & Steady"
            },
            "nervous": {
                "speed": 1.6,  # Slower, calmer pace
                "description": "Slow & Reassuring"
            },
            "neutral": {
                "speed": 2.0,  # Default pace
                "description": "Normal"
            }
        }
        
        # Initialize TTS with clear female voice and optimized speed
        try:
            # Use VITS with female speaker for clear female voice
            self.tts = TTS("tts_models/en/vctk/vits", progress_bar=False, gpu=False)
            self.speaker = "p225"  # Female speaker for VITS
            self.tts_speed = 2.0  # Default speed (will be adjusted based on emotion)
            print("✅ Using VITS female voice model (p225) - clear and natural with emotion-aware speed")
            print("🎤 Emotion-aware TTS initialized:")
            for emotion, settings in self.emotion_tts_settings.items():
                print(f"   {emotion.upper()}: {settings['speed']}x speed ({settings['description']})")
        except Exception as e:
            print(f"⚠️  Failed to load VITS female model: {e}")
            try:
                # Fallback to another female voice model
                self.tts = TTS("tts_models/en/ljspeech/fast_pitch", progress_bar=False, gpu=False)
                self.speaker = None
                self.tts_speed = 2.0  # Increase speed for faster processing (target: ~1 second)
                print("✅ Using fast_pitch model as fallback (clear female voice with 2.0x speed)")
            except Exception as e2:
                print(f"❌ Failed to load alternative TTS model: {e2}")
                try:
                    # Last fallback to tacotron2-DDC
                    self.tts = TTS("tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
                    self.speaker = None
                    self.tts_speed = 2.0  # Increase speed for faster processing (target: ~1 second)
                    print("✅ Using tacotron2-DDC TTS model as final fallback with 2.0x speed")
                except Exception as e3:
                    print(f"❌ Failed to load any TTS model: {e3}")
                    self.tts = None
                    self.speaker = None
        
        # Audio settings optimized for clear female voice (like smooth TTS)
        self.sample_rate = 22050  # Lower sample rate for better compatibility
        self.chunk_size = 2048
        self.channels = 1
        self.chunk_duration = 0.1
        
        # Initialize PyAudio
        self.p = pyaudio.PyAudio()
        self.stream = None
        self.open_audio_stream()
        self.audio_queue = queue.Queue(maxsize=1000)  # Increased from 500 to 1000
        self.is_playing = False
        
        # Audio playback settings
        self.audio_chunk_size = 2048  # Smaller chunks for better compatibility
        
        # Gemini AI settings
        self.gemini_api_key = gemini_api_key
        self.gemini_url = gemini_url
        
        # Thread lock for TTS synthesis
        self.tts_lock = threading.Lock()
        
        # Audio streaming thread - keep it persistent
        self.audio_thread = None
        self.audio_thread_running = False
        
        # Audio pause state
        self.audio_paused = False
        self.audio_pause_lock = threading.Lock()
        
        # Lecture state
        self.current_lecture_section = None
        
        # Image handling
        self.images_folder = "/Users/koushal/Desktop/studybuddy_1/backend/lectures/class7/mathematics/algebra/level1/picture"
        self.current_image = None
        self.current_diagram_info = None
        
        # Q&A settings - disabled by default since we're removing speech recognition
        self.qa_enabled = False
        
        # Lecture state tracking
        self.lecture_running = False
        self.lecture_paused = False
        self.current_section_index = 0
        self.sections = [
            "introduction",
            "fraction_bar_notation", 
            "algebraic_vocabulary",
            "substitution_image",
            "inverse_operations",
            "word_problem_image",
            "real_world_image",
            "conclusion"
        ]
        
        # NEW: Transcript generation
        self.transcript = []
        self.transcript_lock = threading.Lock()
        self.lecture_start_time = None
        self.section_start_times = {}
        
        # NEW: Notes system
        self.notes = []
        self.notes_lock = threading.Lock()
        self.notes_paused_state = False
        
        # Lecture control
        self.lecture_thread = None
        self.lecture_control_lock = threading.Lock()
    
    def disable_qa(self):
        """Disable Q&A sessions"""
        self.qa_enabled = False
        print("🔇 Q&A sessions disabled")
    
    def enable_qa(self):
        """Enable Q&A sessions (text-based only)"""
        self.qa_enabled = True
        print("⌨️  Q&A sessions enabled (text input only)")
    
    def change_voice_to_female(self):
        """Change to a clear female voice"""
        try:
            # Try different female voice models with proper speaker handling
            female_models = [
                ("tts_models/en/vctk/vits", "p225"),  # Best female voice (p225)
                ("tts_models/en/vctk/vits", "p227"),  # Alternative female speaker
                ("tts_models/en/ljspeech/fast_pitch", None),  # Clear female voice
                ("tts_models/en/ljspeech/tacotron2-DDC", None)  # Good female voice
            ]
            
            for model, speaker in female_models:
                try:
                    print(f"🎤 Trying female voice model: {model}")
                    self.tts = TTS(model, progress_bar=False, gpu=False)
                    self.speaker = speaker
                    print(f"✅ Successfully loaded female voice: {model}")
                    return True
                except Exception as e:
                    print(f"❌ Failed to load {model}: {e}")
                    continue
            
            print("❌ Could not load any female voice model")
            return False
            
        except Exception as e:
            print(f"❌ Error changing voice: {e}")
            return False
    
    def change_voice_to_male(self):
        """Change to a male voice"""
        try:
            # Try different male voice models with proper speaker handling
            male_models = [
                ("tts_models/en/ljspeech/fast_pitch", None),  # Good male voice
                ("tts_models/en/ljspeech/tacotron2-DDC", None),  # Alternative male voice
                ("tts_models/en/vctk/vits", "p226")  # Male speaker for VITS
            ]
            
            for model, speaker in male_models:
                try:
                    print(f"🎤 Trying male voice model: {model}")
                    self.tts = TTS(model, progress_bar=False, gpu=False)
                    self.speaker = speaker
                    print(f"✅ Successfully loaded male voice: {model}")
                    return True
                except Exception as e:
                    print(f"❌ Failed to load {model}: {e}")
                    continue
            
            print("❌ Could not load any male voice model")
            return False
            
        except Exception as e:
            print(f"❌ Error changing voice: {e}")
            return False
    
    def list_available_voices(self):
        """List available TTS voices"""
        try:
            models = TTS.list_models()
            print("🎤 Available TTS models:")
            for i, model in enumerate(models[:10]):  # Show first 10
                print(f"  {i+1}. {model}")
            print("... and more")
        except Exception as e:
            print(f"❌ Error listing models: {e}")
        
    def open_audio_stream(self):
        """Open audio stream for playback"""
        try:
            self.stream = self.p.open(
                format=pyaudio.paFloat32,
                channels=self.channels,
                rate=self.sample_rate,
                output=True,
                frames_per_buffer=self.chunk_size
            )
            print("🎵 Audio stream opened successfully")
            # Test the audio stream with a short beep
            test_audio = np.sin(2 * np.pi * 440 * np.linspace(0, 0.1, int(0.1 * self.sample_rate))) * 0.1
            self.stream.write(test_audio.astype(np.float32).tobytes())
            print("🔊 Audio stream test successful - you should hear a short beep")
        except Exception as e:
            print(f"❌ Audio stream error: {e}")
            print("🔄 Trying alternative audio configuration...")
            
            try:
                self.stream = self.p.open(
                    format=pyaudio.paInt16,
                    channels=self.channels,
                    rate=self.sample_rate,
                    output=True,
                    frames_per_buffer=self.chunk_size
                )
                print("🎵 Audio stream opened with alternative format")
                # Test the audio stream with a short beep
                test_audio = np.sin(2 * np.pi * 440 * np.linspace(0, 0.1, int(0.1 * self.sample_rate))) * 0.1
                self.stream.write(test_audio.astype(np.int16).tobytes())
                print("🔊 Audio stream test successful with alternative format")
            except Exception as e2:
                print(f"❌ Alternative audio stream error: {e2}")
                print("⚠️  Audio playback may not work properly")
    
    def close_audio_stream(self):
        """Close audio stream"""
        if self.stream:
            self.stream.close()
            print("🎵 Audio stream closed")
    
    def start_audio_thread(self):
        """Start the audio streaming thread"""
        if not self.audio_thread_running:
            self.audio_thread_running = True
            self.audio_thread = threading.Thread(target=self.persistent_audio_stream, daemon=True)
            self.audio_thread.start()
            print("🎵 Audio thread started")
    
    def stop_audio_thread(self):
        """Stop the audio streaming thread"""
        self.audio_thread_running = False
        if self.audio_thread:
            self.audio_thread.join(timeout=2)
            print("🎵 Audio thread stopped")
    
    def persistent_audio_stream(self):
        """Persistent audio streaming thread"""
        print("🎵 Starting persistent audio stream...")
        
        while self.audio_thread_running:
            try:
                # Check if audio is paused
                with self.audio_pause_lock:
                    if self.audio_paused and not getattr(self, 'interactive_diagram_active', False):
                        time.sleep(0.1)  # Sleep briefly when paused (but not for interactive diagram)
                        continue
                
                # Get audio chunk from queue
                audio_chunk = self.audio_queue.get(timeout=0.01)
                
                if audio_chunk is None:  # Stop signal
                    break
                
                # Check pause state again before playing
                with self.audio_pause_lock:
                    if self.audio_paused and not getattr(self, 'interactive_diagram_active', False):
                        # Put the chunk back in queue for later (but not for interactive diagram)
                        self.audio_queue.put(audio_chunk)
                        time.sleep(0.1)
                        continue
                
                # Play the audio chunk
                if self.stream and self.stream.is_active():
                    self.stream.write(audio_chunk)
                
                self.audio_queue.task_done()
                
            except queue.Empty:
                # No audio in queue, continue
                continue
            except Exception as e:
                print(f"❌ Audio streaming error: {e}")
                continue
        
        print("🎵 Audio stream ended")
    
    def generate_answer_to_question(self, question, current_topic):
        """Generate an answer to a student's question using Gemini with EMOTION AWARENESS"""
        if not self.gemini_api_key or not self.gemini_url:
            return self.get_fallback_answer(question, current_topic)
        
        try:
            # 🎭 DETECT STUDENT EMOTION from question
            emotion_data = self.emotion_detector.detect_emotion(question)
            emotion = emotion_data["emotion"]
            confidence = emotion_data["confidence"]
            
            print(f"🎭 Student emotion: {emotion.upper()} ({confidence:.0%} confidence)")
            print(f"   Adapting response style for {emotion} student...")
            
            # 🎤 ADJUST TTS VOICE based on detected emotion
            self.set_emotion_for_tts(emotion)
            
            # Generate emotion-aware prompt
            prompt = self.emotion_detector.generate_emotion_prompt(
                question=question,
                current_topic=current_topic,
                emotion_data=emotion_data
            )
            
            url_with_key = f"{self.gemini_url}?key={self.gemini_api_key}"
            
            # Add Math Wall rule to the emotion-aware prompt
            enhanced_prompt = self.add_math_wall_rule(prompt)
            
            headers = {
                "Content-Type": "application/json"
            }
            
            data = {
                "contents": [{
                    "parts": [{
                        "text": enhanced_prompt
                    }]
                }]
            }
            
            response = requests.post(url_with_key, headers=headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                generated_text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                print(f"🤖 Gemini generated answer: {len(generated_text)} characters")
                
                # 🔧 POST-PROCESSING: Validate and fix mathematical notation
                validated_text = self.validate_and_fix_mathematical_notation(generated_text)
                return validated_text
            else:
                print(f"❌ Gemini API error: {response.status_code}")
                print(f"Response: {response.text}")
                return self.get_fallback_answer(question, current_topic)
                
        except Exception as e:
            print(f"❌ Error calling Gemini API: {e}")
            return self.get_fallback_answer(question, current_topic)
    
    def get_fallback_answer(self, question, current_topic):
        """Fallback answer when Gemini is not available - with EMOTION AWARENESS"""
        # 🎭 Detect emotion even for fallback
        emotion_data = self.emotion_detector.detect_emotion(question)
        emotion = emotion_data["emotion"]
        
        print(f"🎭 Using emotion-aware fallback for {emotion.upper()} student")
        
        # 🎤 ADJUST TTS VOICE based on detected emotion
        self.set_emotion_for_tts(emotion)
        
        if emotion == "curious":
            answer = (
                f"What a BRILLIANT question about {current_topic}! You're thinking like a real mathematician! "
                "Here's what's really fascinating: algebra is the powerful language where numbers meet letters, "
                "and it lets us solve mysteries that would be impossible with just numbers alone! "
                "Think about x/5 - it's not just division, it's a way to represent ANY number divided by 5. "
                "That's the power of variables! They're like mathematical wildcards. "
                "You can even explore how this connects to equations, graphing, and advanced mathematics. "
                "Keep asking these deep questions - that's exactly how breakthroughs happen! You're on the path to algebraic mastery!"
            )
            return self.validate_and_fix_mathematical_notation(answer)
        elif emotion == "simple":
            answer = (
                f"Good question! Simply put, {current_topic} is all about understanding algebraic notation. "
                "Basically, when we write x/5, we mean 'x divided by 5'. "
                "For example, if x = 10, then x/5 = 10/5 = 2. "
                "In other words, the fraction bar is just another way to show division. "
                "Does that make sense? Feel free to ask for more examples!"
            )
            return self.validate_and_fix_mathematical_notation(answer)
        elif emotion == "nervous":
            answer = (
                f"Don't worry at all! {current_topic} is actually easier than it looks, I promise! "
                "You're doing GREAT by asking this question - that shows you're engaged and learning! "
                "Let's take this step by step: algebra just uses letters (like x, y) to represent numbers we don't know yet. "
                "Think of it like a mystery box - we use x until we figure out what number it is. "
                "For example, x/5 simply means 'whatever x is, divide it by 5'. If x = 20, then x/5 = 4. Easy! "
                "See? You already understand it! This is totally normal to find tricky at first, but you've got this! "
                "Want to try another example together? You're becoming an algebra expert already!"
            )
            return self.validate_and_fix_mathematical_notation(answer)
        else:
            answer = (
                f"That's a great question about {current_topic}! "
                "Algebra helps us work with unknown values using variables like x and y. "
                "Keep asking questions - you're learning really well!"
            )
            return self.validate_and_fix_mathematical_notation(answer)
    
    def handle_qa_session(self, current_topic):
        """Handle Q&A session after each topic (text-based only)"""
        if not self.qa_enabled:
            return
        
        print(f"\n❓ Q&A Session for: {current_topic}")
        print("-" * 40)
        
        # Ask if student has questions
        question_prompt = f"Awesome. Do you have any AMAZING questions about {current_topic}? I'd love to hear what you're curious about. Please type 'yes' or 'no'."
        print(f"⌨️  {question_prompt}")
        
        # Synthesize the question
        synthesis_thread = self.synthesize_and_stream_text(question_prompt)
        synthesis_thread.join()
        
        # Wait for audio to finish completely before proceeding
        print("⏳ Waiting for question to finish playing completely...")
        while not self.audio_queue.empty():
            time.sleep(0.1)
        time.sleep(2.0)  # Extra buffer to ensure audio is completely done
        
        # Get text input for yes/no response (unlimited time)
        print("\n⌨️  Please type 'yes' or 'no': ", end="")
        response = input().lower().strip()
        has_questions = response in ['yes', 'y', 'yeah', 'yep']
        
        if has_questions:
            print("✅ Student has questions - starting Q&A session")
            
            while True:
                # Ask for the question with unlimited time
                question_prompt = "What's your AMAZING question? I can't wait to hear what you're curious about."
                print(f"⌨️  {question_prompt}")
                
                # Synthesize the question prompt
                synthesis_thread = self.synthesize_and_stream_text(question_prompt)
                synthesis_thread.join()
                
                # Wait for audio to finish completely before proceeding
                print("⏳ Waiting for question prompt to finish playing completely...")
                while not self.audio_queue.empty():
                    time.sleep(0.1)
                time.sleep(2.0)  # Extra buffer to ensure audio is completely done
                
                # Get text input for the question (unlimited time)
                print(f"\n⌨️  Please type your question: ", end="")
                question = input().strip()
                
                if question:
                    print(f"❓ Student question: {question}")
                    
                    # Add question to transcript
                    self.add_to_transcript(
                        f"Q&A - {current_topic}",
                        f"Question: {question}"
                    )
                    
                    # Generate answer
                    answer = self.generate_answer_to_question(question, current_topic)
                    print(f"🤖 Generated answer: {len(answer)} characters")
                    
                    # Add answer to transcript
                    self.add_to_transcript(
                        f"Q&A - {current_topic}",
                        f"Answer: {answer}"
                    )
                    
                    # Synthesize and speak the answer
                    synthesis_thread = self.synthesize_and_stream_text(answer)
                    synthesis_thread.join()
                    
                    # Wait for audio to finish completely before proceeding
                    print("⏳ Waiting for answer to finish playing completely...")
                    while not self.audio_queue.empty():
                        time.sleep(0.1)
                    time.sleep(2.0)  # Extra buffer to ensure audio is completely done
                    
                    # Ask if they have more questions
                    more_questions_prompt = "That was such a great question. Do you have any more AMAZING questions? I love your curiosity. Please type 'yes' or 'no'."
                    print(f"⌨️  {more_questions_prompt}")
                    
                    # Synthesize the follow-up question
                    synthesis_thread = self.synthesize_and_stream_text(more_questions_prompt)
                    synthesis_thread.join()
                    
                    # Wait for audio to finish completely before proceeding
                    print("⏳ Waiting for question to finish playing completely...")
                    while not self.audio_queue.empty():
                        time.sleep(0.1)
                    time.sleep(2.0)  # Extra buffer to ensure audio is completely done
                    
                    # Get text input for yes/no response (unlimited time)
                    print("\n⌨️  Please type 'yes' or 'no': ", end="")
                    more_response = input().lower().strip()
                    has_more_questions = more_response in ['yes', 'y', 'yeah', 'yep']
                    
                    if not has_more_questions:
                        print("✅ No more questions - continuing lecture")
                        # Add Q&A session end to transcript
                        self.add_to_transcript(
                            f"Q&A - {current_topic}",
                            "Q&A session completed."
                        )
                        # 🎤 RESET TTS to neutral speed after Q&A
                        self.set_emotion_for_tts("neutral")
                        break
                    else:
                        print("✅ Student has more questions - continuing Q&A")
                        continue
                else:
                    print("⏰ No question entered - continuing lecture")
                    # 🎤 RESET TTS to neutral speed
                    self.set_emotion_for_tts("neutral")
                    break
        else:
            print("✅ No questions - continuing lecture")
            # 🎤 RESET TTS to neutral speed
            self.set_emotion_for_tts("neutral")
        
        print(f"✅ Q&A session completed for: {current_topic}")
        print("-" * 40)
    
    def add_math_wall_rule(self, prompt):
        """Add universal Math Wall rule to any prompt"""
        math_wall_rule = """
🚨🚨🚨 UNIVERSAL MATH WALL RULE - MANDATORY FOR ALL CONTENT 🚨🚨🚨
- ALWAYS use mathematical symbols: x/5, 20/x + 2, x = 7, d/2 = 7, 3x, y/4
- NEVER use word descriptions: "x over 5", "twenty over x plus two", "x equals seven", "three x", "y over four"
- The Math Wall converts symbols to speech automatically
- Examples: Write "x/5" NOT "x over 5", Write "20/x + 2" NOT "20 over x plus 2"
- This rule is NON-NEGOTIABLE and applies to ALL mathematical expressions
- VIOLATION PENALTY: Any word descriptions will be automatically corrected by post-processing
"""
        return math_wall_rule + "\n\n" + prompt

    def validate_and_fix_mathematical_notation(self, text):
        """Post-process text to ensure mathematical notation compliance"""
        if not text:
            return text
            
        # Common word-to-symbol replacements
        replacements = {
            # Division patterns
            r'\b(\w+)\s+over\s+(\w+)\b': r'\1/\2',
            r'\b(\w+)\s+divided\s+by\s+(\w+)\b': r'\1/\2',
            r'\b(\w+)\s+÷\s+(\w+)\b': r'\1/\2',
            
            # Multiplication patterns  
            r'\b(\d+)\s+x\b': r'\1x',
            r'\b(\d+)\s+times\s+(\w+)\b': r'\1\2',
            r'\b(\w+)\s+times\s+(\d+)\b': r'\1\2',
            
            # Equality patterns
            r'\b(\w+)\s+equals\s+(\w+)\b': r'\1 = \2',
            r'\b(\w+)\s+=\s+(\w+)\b': r'\1 = \2',
            
            # Number word patterns
            r'\btwenty\b': '20',
            r'\bten\b': '10',
            r'\bfive\b': '5',
            r'\bfour\b': '4',
            r'\bthree\b': '3',
            r'\btwo\b': '2',
            r'\bone\b': '1',
            r'\bsix\b': '6',
            r'\bseven\b': '7',
            r'\beight\b': '8',
            r'\bnine\b': '9',
            r'\bfifteen\b': '15',
            r'\btwelve\b': '12',
            r'\bforty\b': '40',
            r'\bforty-two\b': '42',
            
            # Common phrases
            r'\bplus\s+(\w+)\b': r'+ \1',
            r'\bminus\s+(\w+)\b': r'- \1',
        }
        
        # Apply replacements
        fixed_text = text
        for pattern, replacement in replacements.items():
            fixed_text = re.sub(pattern, replacement, fixed_text, flags=re.IGNORECASE)
        
        # Log if any changes were made
        if fixed_text != text:
            print(f"🔧 POST-PROCESSING: Fixed mathematical notation")
            print(f"   BEFORE: {text[:100]}...")
            print(f"   AFTER:  {fixed_text[:100]}...")
        
        return fixed_text
    
    def generate_text_with_gemini(self, prompt):
        """Generate text using Gemini AI with retry logic"""
        if not self.gemini_api_key or not self.gemini_url:
            print("⚠️  Gemini API key or URL not provided, using fallback text")
            return self.get_fallback_text(prompt)
        
        # Add Math Wall rule to every prompt
        enhanced_prompt = self.add_math_wall_rule(prompt)
        
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                url_with_key = f"{self.gemini_url}?key={self.gemini_api_key}"
                
                headers = {
                    "Content-Type": "application/json"
                }
                
                data = {
                    "contents": [{
                        "parts": [{
                            "text": enhanced_prompt
                        }]
                    }]
                }
                
                response = requests.post(url_with_key, headers=headers, json=data, timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    print(f"🤖 Gemini generated text: {len(generated_text)} characters")
                    
                    # 🔧 POST-PROCESSING: Validate and fix mathematical notation
                    validated_text = self.validate_and_fix_mathematical_notation(generated_text)
                    return validated_text
                elif response.status_code == 503:
                    print(f"⚠️  Gemini API overloaded (503), attempt {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        print("❌ Gemini API still overloaded after retries, using fallback")
                        return self.get_fallback_text(prompt)
                else:
                    print(f"❌ Gemini API error: {response.status_code}")
                    print(f"Response: {response.text}")
                    return self.get_fallback_text(prompt)
                    
            except requests.exceptions.Timeout:
                print(f"⚠️  Gemini API timeout, attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                else:
                    print("❌ Gemini API timeout after retries, using fallback")
                    return self.get_fallback_text(prompt)
            except Exception as e:
                print(f"❌ Error calling Gemini API: {e}")
                return self.get_fallback_text(prompt)
        
        return self.get_fallback_text(prompt)
    
    def get_fallback_text(self, prompt):
        """Fallback text based on the lecture section"""
        prompt_lower = prompt.lower()
        
        if "introduction" in prompt_lower:
            return (
                "Hello future mathematicians! I'm your AI tutor, and today we're starting our journey into algebra - the powerful language where numbers meet letters! "
                "This first level is all about building a solid foundation by mastering the new vocabulary and notation, especially how we handle division. "
                "By the end of this lecture, you'll be able to read, understand, and set up your first algebraic equations! "
                "What we'll cover today: New notation for division using the algebraic standard, the vocabulary of variables, constants, and terms, "
                "understanding division as the essential inverse operation of multiplication, and setting up simple equations from word problems. "
                "Let's dive in and transform our basic arithmetic skills into concrete algebraic concepts!"
            )
        elif "fraction bar" in prompt_lower or "division notation" in prompt_lower:
            return (
                "In your earlier math courses, you primarily used the standard division symbol, ÷ (for example, 10÷2=5). "
                "In algebra, we nearly always stop using that symbol. Why? Because the division symbol can look confusing or be easily mistaken for other symbols, "
                "especially as equations get longer and more complex. "
                "The most common, clear, and preferred way to show division in algebra is using the fraction bar. "
                "The expression 'x divided by 5' is written as x over 5. "
                "The expression 'the sum of a and b, divided by 2' is written as (a+b) over 2. "
                "The fraction bar is so effective because it functions as a built-in grouping symbol. "
                "It instantly tells you to treat the entire numerator (the top part, or dividend) as a single group, "
                "and the entire denominator (the bottom part, or divisor) as another, simplifying the visual hierarchy of the equation!"
            )
        elif "variables constants terms" in prompt_lower or "vocabulary" in prompt_lower:
            return (
                "Let's learn the core vocabulary using an expression that involves division: 4 over y plus 9. "
                "Breaking this down is essential for understanding any algebraic problem. "
                "Variable (y): This is the letter. It represents a value that is unknown or prone to change. We need to find its value to solve the problem. "
                "Constant (9): This is the fixed number. Its value never changes, regardless of what the variable is. "
                "Term (4 over y and 9): Terms are separated by addition or subtraction signs. This expression has two terms. "
                "The term 4 over y specifically means 'some unknown quantity (y) is being shared equally among 4 people or groups,' "
                "clearly embedding the idea of division into the term itself!"
            )
        elif "substitution" in prompt_lower or "evaluate" in prompt_lower:
            return (
                "Before we solve equations, we must master substitution. Substitution means replacing the variable with a known numerical value and simplifying the expression. "
                "Problem: Evaluate the expression 20 over x plus 2 if the variable x equals 5. "
                "Solution Steps: First, substitute by replacing x with the given number 5: 20 over 5 plus 2. "
                "Second, divide first using Order of Operations: Calculate the division: 20 divided by 5 equals 4. "
                "Third, add last: Complete the addition: 4 plus 2 equals 6. "
                "The value of the expression is 6. This step confirms you understand the notation and the structure of an expression involving division!"
            )
        elif "inverse operations" in prompt_lower or "multiplication division" in prompt_lower:
            return (
                "The key to solving any equation is using inverse operations to isolate the variable. The variable is like a treasure, and inverse operations are the keys to unlocking it. "
                "The inverse (or opposite) of addition is subtraction. Crucially for this unit, the inverse of multiplication is division. "
                "If you have a variable x being multiplied by 3 (3x), you must divide both sides by 3 to 'undo' the multiplication and solve for x. "
                "Similarly, if you have a variable y being divided by 4 (y over 4), you must multiply both sides by 4 to 'undo' the division and solve for y. "
                "Remember the most important rule of algebra: An equation is a balanced scale. Whatever operation you apply to one side of the equation, "
                "you MUST apply the exact same operation to the other side to keep it perfectly balanced!"
            )
        elif "word problems" in prompt_lower or "translating" in prompt_lower:
            return (
                "Now we combine our new notation and vocabulary to master a crucial skill: translating a sentence into a solvable algebraic equation. "
                "Word Problem: 'When a number is divided by six, the result is seven.' "
                "Translation Steps: First, 'A number' becomes our variable: x. "
                "Second, 'is divided by six' is written using the fraction bar: x over 6. "
                "Third, 'the result is seven' sets the right side of the equation: equals 7. "
                "The Final Equation: x over 6 equals 7. "
                "We have successfully set up a simple division equation! We won't solve it yet - that's Level 2 - "
                "but recognizing how the words map to the symbols is Level 1 mastery!"
            )

        else:
            return (
                "Algebra is the powerful language where numbers meet letters! "
                "It helps us solve problems by using variables to represent unknown values. "
                "Through division notation, vocabulary building, and understanding inverse operations, "
                "we can translate everyday situations into mathematical equations and solve them step by step. "
                "This foundation will help you tackle more complex algebraic challenges in the future!"
            )
    
    def set_emotion_for_tts(self, emotion):
        """
        Set the current emotion for TTS voice modulation
        
        Args:
            emotion (str): The emotion to set (curious, simple, nervous, neutral)
        """
        if emotion in self.emotion_tts_settings:
            self.current_emotion = emotion
            self.tts_speed = self.emotion_tts_settings[emotion]["speed"]
            description = self.emotion_tts_settings[emotion]["description"]
            print(f"🎤 TTS Voice adjusted for {emotion.upper()} student:")
            print(f"   Speed: {self.tts_speed}x ({description})")
        else:
            print(f"⚠️  Unknown emotion '{emotion}', using neutral settings")
            self.current_emotion = "neutral"
            self.tts_speed = self.emotion_tts_settings["neutral"]["speed"]
    
    def clean_text_for_tts(self, text):
        """Clean text for better TTS synthesis"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters that might cause TTS issues
        text = re.sub(r'[^\w\s\.\,\!\?\-\:\;]', '', text)
        
        # Ensure proper sentence endings
        text = text.strip()
        if not text.endswith(('.', '!', '?')):
            text += '.'
        
        # Limit length to prevent memory issues
        if len(text) > 2000:
            text = text[:2000] + "..."
        
        # 🔧 POST-PROCESSING: Validate and fix mathematical notation
        validated_text = self.validate_and_fix_mathematical_notation(text)
        return validated_text
    
    def synthesis_worker(self, text_chunks):
        """Worker thread for TTS synthesis"""
        try:
            with self.tts_lock:
                for i, chunk in enumerate(text_chunks):
                    # For interactive diagram, we want to continue even if audio is paused or lecture is complete
                    if not self.audio_thread_running and not getattr(self, 'interactive_diagram_active', False):
                        # Start audio thread if interactive diagram is active but audio thread is not running
                        if getattr(self, 'interactive_diagram_active', False):
                            print("🎤 Interactive diagram active but audio thread not running - starting audio thread")
                            self.start_audio_thread()
                        else:
                            break
                    
                    try:
                        # Clean the text chunk
                        clean_chunk = self.clean_text_for_tts(chunk)
                        
                        if not clean_chunk.strip():
                            continue
                        
                        print(f"🎤 Synthesizing chunk {i+1}/{len(text_chunks)}: {len(clean_chunk)} characters")
                        
                        # Synthesize audio with speed control
                        if self.speaker:
                            audio_data = self.tts.tts(clean_chunk, speaker=self.speaker, speed=self.tts_speed)
                        else:
                            audio_data = self.tts.tts(clean_chunk, speed=self.tts_speed)
                        
                        # Convert to numpy array if needed
                        if isinstance(audio_data, list):
                            audio_data = np.array(audio_data)
                        
                        # Ensure audio data is float32
                        if audio_data.dtype != np.float32:
                            audio_data = audio_data.astype(np.float32)
                        
                        # Normalize audio
                        if np.max(np.abs(audio_data)) > 0:
                            audio_data = audio_data / np.max(np.abs(audio_data)) * 0.8
                        
                        # Convert to bytes and add to queue
                        audio_bytes = audio_data.tobytes()
                        
                        # Progressive chunk sizing for smooth streaming:
                        # - Early chunks: Small (fast to start playing)
                        # - Middle chunks: Medium (build buffer)
                        # - Later chunks: Large (we have time from buffer)
                        total_chunks = len(text_chunks)
                        chunk_position = i / max(total_chunks - 1, 1)  # 0.0 to 1.0
                        
                        # Calculate progressive chunk size multiplier
                        if chunk_position < 0.25:  # First 25% - smallest chunks
                            size_multiplier = 1
                        elif chunk_position < 0.75:  # Middle 50% - medium chunks
                            size_multiplier = 2
                        else:  # Last 25% - largest chunks
                            size_multiplier = 4
                        
                        chunk_size = self.audio_chunk_size * size_multiplier * 4  # 4 bytes per float32
                        
                        for j in range(0, len(audio_bytes), chunk_size):
                            chunk_bytes = audio_bytes[j:j + chunk_size]
                            # Pad incomplete chunks with zeros to avoid gaps
                            if len(chunk_bytes) < chunk_size:
                                chunk_bytes += b'\x00' * (chunk_size - len(chunk_bytes))
                            # Always add chunk to queue (complete or padded)
                            self.audio_queue.put(chunk_bytes)
                        
                        print(f"✅ Chunk {i+1} synthesized and queued (size_mult: {size_multiplier}x)")
                        
                    except Exception as e:
                        print(f"❌ Error synthesizing chunk {i+1}: {e}")
                        continue
                        
        except Exception as e:
            print(f"❌ Error in synthesis worker: {e}")
    
    def synthesize_and_stream_text(self, text):
        """Synthesize text to speech and stream it"""
        if not self.tts:
            print("❌ TTS not available")
            return None
        
        try:
            # 🧱 REVOLUTIONARY MATH WALL PREPROCESSING
            print(f"🧱 Math Wall processing: '{text[:50]}...'")
            processed_text = self.math_wall.process_text(text)
            print(f"🧱 Math Wall output: '{processed_text[:50]}...'")
            
            # Split processed text into small chunks (15-20 words per chunk for fast streaming)
            words = processed_text.split()
            text_chunks = []
            current_chunk = []
            word_count = 0
            
            for word in words:
                current_chunk.append(word)
                word_count += 1
                
                # Create a chunk every 15-20 words or at sentence boundaries
                if word_count >= 20 and (word.endswith('.') or word.endswith(',') or word_count >= 25):
                    text_chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    word_count = 0
            
            # Add remaining words as final chunk
            if current_chunk:
                text_chunks.append(' '.join(current_chunk))
            
            if not text_chunks:
                print("❌ No text to synthesize")
                return None
            
            print(f"🎤 Starting TTS synthesis for {len(text_chunks)} chunks...")
            
            # For interactive diagram, ensure audio is ready
            if getattr(self, 'interactive_diagram_active', False):
                print("🎤 Interactive diagram mode - ensuring audio is ready")
                # Ensure audio stream is open
                if not self.stream or not self.stream.is_active():
                    self.open_audio_stream()
                # Ensure audio thread is running
                if not self.audio_thread_running:
                    self.start_audio_thread()
            
            # Create synthesis thread
            synthesis_thread = threading.Thread(
                target=self.synthesis_worker,
                args=(text_chunks,),
                daemon=True
            )
            synthesis_thread.start()
            
            return synthesis_thread
            
        except Exception as e:
            print(f"❌ Error starting TTS synthesis: {e}")
            return None

    
    def load_and_display_image(self, image_filename):
        """Load and display an image and notify frontend"""
        try:
            image_path = os.path.join(self.images_folder, image_filename)
            if os.path.exists(image_path):
                print(f"🖼️  Image loaded: {image_filename}")
                self.current_image = image_path
                # Notify frontend about diagram display
                self.send_diagram_display_signal(image_filename, image_path)
                return True
            else:
                print(f"⚠️  Image not found: {image_path}")
                return False
        except Exception as e:
            print(f"❌ Error loading image: {e}")
            return False
    
    def send_diagram_display_signal(self, image_filename, image_path):
        """Send signal to frontend to display diagram overlay"""
        try:
            # Get the current section name
            current_section = getattr(self, 'current_lecture_section', 'diagram_explanation')
            
            # Create appropriate message based on section
            if current_section == "substitution_image":
                message = "🖼️ Displaying substitution machine! Look at how variables are replaced with numbers!"
            elif current_section == "word_problem_image":
                message = "🖼️ Displaying translation machine! See how words become mathematical equations!"
            elif current_section == "real_world_image":
                message = "🖼️ Displaying real life application! See how algebra helps solve everyday problems!"
            elif current_section == "algebraic_vocabulary":
                message = "🖼️ Displaying algebraic vocabulary! Learn about variables, constants, and terms!"
            else:
                message = "🖼️ Displaying algebra expression diagram. Take a close look at the variables, constants, and terms!"
            
            # This will be handled by the WebSocket or API endpoint
            diagram_info = {
                "type": "diagram_display",
                "image_filename": image_filename,
                "image_path": image_path,
                "section": current_section,
                "message": message
            }
            print(f"📡 Sending diagram display signal: {diagram_info}")
            # Store diagram info for frontend to retrieve
            self.current_diagram_info = diagram_info
        except Exception as e:
            print(f"❌ Error sending diagram signal: {e}")
    
    
    def deliver_full_lecture(self):
        """Deliver the complete physics lecture with all sections in one flow"""
        print("🎓 Starting complete Physics lecture on waves...")
        print("=" * 60)
        print(f"🔍 Debug: self.sections = {self.sections}")
        print(f"🔍 Debug: self.lecture_running = {self.lecture_running}")
        
        # Initialize lecture state
        with self.lecture_control_lock:
            self.lecture_running = True
            self.current_section_index = 0
            self.lecture_start_time = datetime.now()
            self.clear_transcript()
            print("✅ Lecture state initialized")
        
        print("✅ Starting audio thread...")
        # Start audio thread
        self.start_audio_thread()
        print("✅ Audio thread started")
        
        try:
            # SLIDE 1: Introduction (no Q&A)
            print("\n📚 SLIDE 1: INTRODUCTION")
            print("-" * 30)
            self.current_lecture_section = "introduction"
            self.current_section_index = 0
            self.section_start_times["introduction"] = datetime.now()
            
            intro_prompt = """
            🚨🚨🚨 BULLETPROOF MATH NOTATION RULE - ZERO TOLERANCE 🚨🚨🚨
            - MANDATORY: Use ONLY mathematical symbols: x/5, 20/x + 2, x = 7, d/2 = 7, 3x, y/4
            - FORBIDDEN: Word descriptions like "x over 5", "twenty over x plus two", "x equals seven", "three x", "y over four"
            - ENFORCEMENT: Post-processing will automatically fix any violations
            - EXAMPLES: Write "x/5" NOT "x over 5", Write "20/x + 2" NOT "20 over x plus 2"
            - PENALTY: Any word descriptions will be corrected by the system
            
            Generate an exciting and super friendly introduction for a Class 7 Mathematics lesson about Algebra Level 1: The Language of Division! 
            The introduction should:
            - Be 150-200 words
            - Start with a super warm welcome like "Hello future mathematicians!" or "Welcome to the amazing world of algebra!"
            - Use fun, energetic language that makes students feel excited about math
            - Explain algebra as "the powerful language where numbers meet letters" or "the secret code of mathematics"
            - Mention that algebra helps us solve everyday problems and unlock mathematical mysteries
            - Give fun examples like "figuring out how much pizza each friend gets", "calculating phone bill charges", "solving mystery numbers"
            - Use exclamation marks and positive energy!
            - Include phrases like "get ready for an amazing journey", "you're going to discover something incredible"
            - Make students feel like they're about to unlock a secret superpower
            - Use words like "awesome", "amazing", "incredible", "super cool"
            - End with excitement about what they'll learn
            - Be super encouraging and make them feel like they can do anything!
            - CRITICAL: When mentioning any math, use ONLY symbols like x/5, 20/x + 2, d/2 = 7
            """
            
            intro_text = self.generate_text_with_gemini(intro_prompt)
            print(f"📚 Introduction generated: {len(intro_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("introduction", intro_text)
            
            synthesis_thread = self.synthesize_and_stream_text(intro_text)
            synthesis_thread.join()
            print("✅ Introduction completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Check for pause after section completion
            if not self.wait_if_paused():
                return  # Lecture was stopped while paused
            
            # SLIDE 2: Fraction Bar Notation
            print("\n📚 SLIDE 2: FRACTION BAR NOTATION")
            print("-" * 30)
            self.current_lecture_section = "fraction_bar_notation"
            self.current_section_index = 1
            self.section_start_times["fraction_bar_notation"] = datetime.now()
            
            waves_prompt = """
            🚨🚨🚨 BULLETPROOF MATH NOTATION RULE - ZERO TOLERANCE 🚨🚨🚨
            - MANDATORY: Use ONLY mathematical symbols: x/5, 20/x + 2, x = 7, (a+b)/2, y/3, d/2
            - FORBIDDEN: Word descriptions like "x over 5", "x divided by 5", "twenty over x", "x equals seven", "a plus b over 2"
            - ENFORCEMENT: Post-processing will automatically fix any violations
            - EXAMPLES: Write "x/5" NOT "x over 5", Write "(a+b)/2" NOT "a plus b over 2"
            - PENALTY: Any word descriptions will be corrected by the system
            
            Generate a super fun and exciting explanation of algebraic notation for division (fraction bar) for Class 7 Mathematics students! 
            The explanation should:
            - Be 150-200 words
            - Start with something exciting like "Okay, get ready for something AMAZING!"
            - Explain that in algebra, we use fraction bars instead of the ÷ symbol
            - Show examples using ONLY symbols: x/5, (a+b)/2, 20/x, y/3
            - Explain that fraction bars are like built-in grouping symbols that make math clearer
            - Use fun analogies like "fraction bars are like invisible parentheses that group things together"
            - Give super relatable examples like "sharing pizza equally", "dividing money among friends", "calculating average scores"
            - When showing math, write ONLY: x/5, (a+b)/2, 20/x + 2, y/3 = 4
            - Use energetic language with exclamation marks!
            - Include phrases like "isn't that incredible?", "how cool is that?", "you're going to love this!"
            - Make it feel like they're discovering a secret mathematical power
            - Use words like "awesome", "amazing", "incredible", "super cool", "mind-blowing"
            - Connect to things they know: sharing, dividing, grouping
            - Make them feel like they're becoming algebra experts
            - End with excitement about learning more algebraic notation
            - CRITICAL: Every mathematical expression MUST use symbols, never words
            """
            
            waves_text = self.generate_text_with_gemini(waves_prompt)
            print(f"📚 Fraction bar notation explanation generated: {len(waves_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("fraction_bar_notation", waves_text)
            
            synthesis_thread = self.synthesize_and_stream_text(waves_text)
            synthesis_thread.join()
            print("✅ Fraction bar notation explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Check for pause after section completion
            if not self.wait_if_paused():
                return  # Lecture was stopped while paused
            
            # Q&A for fraction bar notation
            self.handle_qa_session("fraction bar notation")
            time.sleep(1.0)
            
            # SLIDE 3: Algebraic Vocabulary Diagram (algebra_1.png)
            print("\n📚 SLIDE 3: ALGEBRAIC VOCABULARY DIAGRAM")
            print("-" * 30)
            self.current_lecture_section = "algebraic_vocabulary"
            self.current_section_index = 2
            self.section_start_times["algebraic_vocabulary"] = datetime.now()
            
            # Load the algebraic vocabulary image
            self.load_and_display_image("algebra_1.png")
            
            types_prompt = """
            🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
            YOU MUST WRITE: 4/y + 9 (using symbols)
            YOU MUST NOT WRITE: "4 over y plus 9" or "four over y" or "y divided by" 
            
            EXAMPLES OF CORRECT FORMAT:
            ✅ "Look at 4/y + 9"
            ✅ "The expression 4/y + 9 has two terms"
            ✅ "In 4/y + 9, the variable is y"
            ✅ "The term 4/y means division"
            
            EXAMPLES OF WRONG FORMAT (NEVER USE THESE):
            ❌ "Look at 4 over y plus 9"
            ❌ "The expression four over y plus nine"
            ❌ "In four over y plus nine"
            ❌ "The term 4 over y"
            
            The Math Wall automatically converts 4/y to speech. YOU just write the symbols!
            
            Generate a super exciting explanation of algebraic vocabulary (variables, constants, and terms) using the image shown! 
            The explanation should:
            - Be 150-200 words
            - Start with something like "Look at this amazing diagram! Let me explain the secret language of algebra!"
            - Reference the image: "In this picture, you can see the different parts of an algebraic expression"
            - Explain variables as "mystery boxes" or "letters that hold secrets" (like x, y, z) - point to them in the image
            - Explain constants as "your best friends who never change" (like 5, 10, 3.14) - show them in the image
            - Explain terms as "separate parts of a mathematical sentence" separated by + or - - highlight them in the image
            
            🚨 WHEN GIVING EXAMPLES, WRITE EXACTLY LIKE THIS:
            "Let's look at 4/y + 9. The variable is y. The constant is 9. We have two terms: 4/y and 9."
            
            NOT LIKE THIS: "Let's look at 4 over y plus 9" ❌
            
            - Show more examples using ONLY symbols: 3x + 2, y/5 = 7, 20/x + 4
            - Use phrases like "isn't that mind-blowing?", "how awesome is that?", "you're learning something incredible!"
            - Make it feel like they're discovering secret mathematical powers
            - Use energetic language with exclamation marks!
            - Connect to things they know: mystery boxes, best friends, sentences
            - Make them feel like they're becoming algebra detectives
            - Always reference what they can see in the image
            - End with excitement about learning more algebraic vocabulary
            
            REMEMBER: Write 4/y NOT "4 over y" or "four over y"!
            """
            
            types_text = self.generate_text_with_gemini(types_prompt)
            print(f"📚 Algebraic vocabulary explanation generated: {len(types_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("algebraic_vocabulary", types_text)
            
            synthesis_thread = self.synthesize_and_stream_text(types_text)
            synthesis_thread.join()
            print("✅ Algebraic vocabulary explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Check for pause after section completion
            if not self.wait_if_paused():
                return  # Lecture was stopped while paused
            
            # Q&A for algebraic vocabulary
            self.handle_qa_session("algebraic vocabulary")
            time.sleep(1.0)
            
            # SLIDE 4: Substitution Machine Diagram (algebra_2.png)
            print("\n📚 SLIDE 4: SUBSTITUTION MACHINE DIAGRAM")
            print("-" * 30)
            self.current_lecture_section = "substitution_image"
            self.current_section_index = 3
            self.section_start_times["substitution_image"] = datetime.now()
            
            # Load the substitution machine image
            self.load_and_display_image("algebra_2.png")
            
            substitution_image_prompt = """
            🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
            YOU MUST WRITE: 20/x + 2, x = 5, 20/5 + 2, 20/5 = 4 (using symbols)
            YOU MUST NOT WRITE: "20 over x", "twenty over x", "x equals 5" 
            
            EXAMPLES OF CORRECT FORMAT:
            ✅ "The rule is 20/x + 2"
            ✅ "When x = 5, we calculate 20/5 + 2"
            ✅ "The result is 20/5 = 4, and 4 + 2 = 6"
            ✅ "The machine shows 20/x + 2"
            
            EXAMPLES OF WRONG FORMAT (NEVER USE THESE):
            ❌ "The rule is 20 over x plus 2"
            ❌ "When x equals 5, we calculate 20 over 5"
            ❌ "The result is twenty over five equals four"
            ❌ "The machine shows twenty over x"
            
            The Math Wall automatically converts 20/x to speech. YOU just write the symbols!
            
            Generate a super exciting explanation of the substitution machine shown in the image! 
            The explanation should:
            - Be 150-200 words
            - Start with something like "Look at this amazing algebra machine! It's like a magical calculator!"
            - Explain the machine: "The blue question mark block represents our mystery variable x, and the yellow circle shows 5 is the value we're substituting"
            - Describe the process: "The red funnel is where we pour in our numbers, and the red gear does all the mathematical work"
            
            🚨 WRITE EXACTLY LIKE THIS:
            "The whiteboard shows our rule: 20/x + 2. When x = 5, the machine calculates 20/5 + 2. The green box shows 6! Because 20/5 = 4, and 4 + 2 = 6."
            
            NOT LIKE THIS: "The whiteboard shows twenty over x plus two" ❌
            
            - Use phrases like "isn't this incredible?", "how cool is this algebra machine?", "you're learning to use mathematical tools!"
            - Make it feel like they're operating a real mathematical machine
            - Use energetic language with exclamation marks!
            - Connect to things they know: machines, calculators, funnels, gears
            - End with excitement about solving more substitution problems
            
            REMEMBER: Write 20/x + 2 NOT "20 over x plus 2"!
            """
            
            substitution_image_text = self.generate_text_with_gemini(substitution_image_prompt)
            print(f"📚 Substitution image explanation generated: {len(substitution_image_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("substitution_image", substitution_image_text)
            
            synthesis_thread = self.synthesize_and_stream_text(substitution_image_text)
            synthesis_thread.join()
            print("✅ Substitution image explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Q&A for substitution machine
            self.handle_qa_session("substitution machine")
            time.sleep(1.0)
            
            # SLIDE 5: Inverse Operations
            print("\n📚 SLIDE 5: INVERSE OPERATIONS")
            print("-" * 30)
            self.current_lecture_section = "inverse_operations"
            self.current_section_index = 4
            self.section_start_times["inverse_operations"] = datetime.now()
            
            examples_prompt = """
            🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
            YOU MUST WRITE: 3x, y/4, 2x = 10, x = 5, x/3 = 4, x = 12 (using symbols)
            YOU MUST NOT WRITE: "three x", "y over 4", "two x equals ten" 
            
            EXAMPLES OF CORRECT FORMAT:
            ✅ "If you have 3x, divide by 3"
            ✅ "If you have y/4, multiply by 4"
            ✅ "To solve 2x = 10, divide both sides by 2 to get x = 5"
            ✅ "To solve x/3 = 4, multiply both sides by 3 to get x = 12"
            
            EXAMPLES OF WRONG FORMAT (NEVER USE THESE):
            ❌ "If you have three x, divide by three"
            ❌ "If you have y over four, multiply by four"
            ❌ "To solve two x equals ten"
            ❌ "You get x equals five"
            
            The Math Wall automatically converts 3x to speech. YOU just write the symbols!
            
            Generate super exciting explanation of inverse operations in algebra for Class 7 Mathematics students! 
            The explanation should:
            - Be 150-200 words
            - Start with something like "Now let's discover the secret keys to solving equations!"
            - Explain inverse operations as "opposite operations that undo each other" - like keys that unlock mysteries
            
            🚨 WRITE EXACTLY LIKE THIS:
            "If you have 3x, divide by 3 to find x. If you have y/4, multiply by 4 to find y. To solve 2x = 10, divide both sides by 2 to get x = 5."
            
            NOT LIKE THIS: "If you have three x, divide by three" ❌
            
            - Use the balance analogy: "An equation is like a balanced scale - whatever you do to one side, you must do to the other"
            - Show more examples: 5x = 25, x/2 = 7, 4x = 20
            - Use phrases like "isn't that amazing?", "how cool is that?", "you're learning the secret to solving any equation!"
            - Make it feel like they're discovering mathematical superpowers
            - Use energetic language with exclamation marks!
            - Connect to things they know: keys, locks, scales, balance
            - Make them feel like they're becoming equation-solving experts
            - End with excitement about solving real algebraic equations
            
            REMEMBER: Write 2x = 10 NOT "two x equals ten"!
            """
            
            examples_text = self.generate_text_with_gemini(examples_prompt)
            print(f"📚 Inverse operations explanation generated: {len(examples_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("inverse_operations", examples_text)
            
            synthesis_thread = self.synthesize_and_stream_text(examples_text)
            synthesis_thread.join()
            print("✅ Inverse operations explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Check for pause after section completion
            if not self.wait_if_paused():
                return  # Lecture was stopped while paused
            
            # Q&A for inverse operations
            self.handle_qa_session("inverse operations")
            time.sleep(1.0)
            
            # SLIDE 6: Word Problem Translation Diagram (algebra_3.png)
            print("\n📚 SLIDE 6: WORD PROBLEM TRANSLATION DIAGRAM")
            print("-" * 30)
            self.current_lecture_section = "word_problem_image"
            self.current_section_index = 5
            self.section_start_times["word_problem_image"] = datetime.now()
            
            # Load the translation machine image
            self.load_and_display_image("algebra_3.png")
            
            word_problem_prompt = """
            🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
            YOU MUST WRITE: x/6 = 7, y/5 = 3, d/2, x = 42 (using symbols)
            YOU MUST NOT WRITE: "x over 6 equals 7", "x over six", "d over 2" 
            
            EXAMPLES OF CORRECT FORMAT:
            ✅ "The whiteboard shows x/6 = 7"
            ✅ "The machine outputs x/6 = 7"
            ✅ "The equation is x/6 = 7"
            ✅ "Another example: y/5 = 3"
            
            EXAMPLES OF WRONG FORMAT (NEVER USE THESE):
            ❌ "The whiteboard shows x over 6 equals 7"
            ❌ "The machine outputs x over six equals seven"
            ❌ "The equation is x over six equals seven"
            ❌ "Another example: y over five equals three"
            
            The Math Wall automatically converts x/6 to speech. YOU just write the symbols!
            
            Generate a super exciting explanation of the word problem translation machine shown in the image! 
            The explanation should:
            - Be 150-200 words
            - Start with something like "Look at this incredible MATH-IFIER machine! It turns words into math!"
            - Explain the input: "The blue speech bubble says 'A number divided by 6 equals 7' - that's our word problem"
            - Describe the machine: "The MATH-IFIER machine has gears and pipes that process the words and turn them into mathematical symbols"
            - Explain the translation: "The machine takes 'A number' and turns it into x, processes 'divided by 6' and 'equals 7' to create the equation"
            
            🚨 WRITE EXACTLY LIKE THIS:
            "The whiteboard shows the final equation: x/6 = 7. If the problem says 'A number divided by 5 equals 3', the machine outputs y/5 = 3."
            
            NOT LIKE THIS: "The whiteboard shows x over six equals seven" ❌
            
            - Use phrases like "isn't this incredible?", "how amazing is this translation machine?", "you're learning to speak the language of mathematics!"
            - Make it feel like they're using a magical word-to-math converter
            - Use energetic language with exclamation marks!
            - Connect to things they know: translators, machines, converting languages
            - End with excitement about translating more word problems into equations
            
            REMEMBER: Write x/6 = 7 NOT "x over 6 equals 7"!
            """
            
            word_problem_text = self.generate_text_with_gemini(word_problem_prompt)
            print(f"📚 Word problem translation explanation generated: {len(word_problem_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("word_problem_image", word_problem_text)
            
            synthesis_thread = self.synthesize_and_stream_text(word_problem_text)
            synthesis_thread.join()
            print("✅ Word problem translation explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Q&A for word problems
            self.handle_qa_session("word problem translation")
            time.sleep(1.0)
            
            # SLIDE 7: Real-World Application Diagram (algebra_4.png)
            print("\n📚 SLIDE 7: REAL-WORLD APPLICATION DIAGRAM")
            print("-" * 30)
            self.current_lecture_section = "real_world_image"
            self.current_section_index = 6
            self.section_start_times["real_world_image"] = datetime.now()
            
            # Load the phone bill image
            self.load_and_display_image("algebra_4.png")
            
            real_world_prompt = """
            🚨🚨🚨 CRITICAL RULE - READ THIS FIRST 🚨🚨🚨
            YOU MUST WRITE: 10 + d/2, d = 14, d/2 = 7, 10 + 7 = 17 (using symbols)
            YOU MUST NOT WRITE: "ten plus d over 2", "d over two", "d equals 14" 
            
            EXAMPLES OF CORRECT FORMAT:
            ✅ "Your total bill is 10 + d/2"
            ✅ "If d = 14, then d/2 = 7"
            ✅ "So 10 + 7 = 17"
            ✅ "If d = 20, then d/2 = 10, so 10 + 10 = 20"
            
            EXAMPLES OF WRONG FORMAT (NEVER USE THESE):
            ❌ "Your total bill is ten plus d over two"
            ❌ "If d equals fourteen, then d over two equals seven"
            ❌ "So ten plus seven equals seventeen"
            ❌ "If d equals twenty"
            
            The Math Wall automatically converts d/2 to speech. YOU just write the symbols!
            
            Generate a super exciting explanation of the phone bill algebraic expression shown in the image! 
            The explanation should:
            - Be 150-200 words
            - Start with something like "Look at this real life algebra problem! It's about your phone bill!"
            - Explain the components: "The phone icon represents your mobile phone, the blue circle shows 10 is your fixed monthly fee"
            - Describe the expression: "The plus sign connects the fixed fee to the variable part: d/2"
            - Explain the variable: "The battery with d inside represents your data usage cost, dividing by 2"
            
            🚨 WRITE EXACTLY LIKE THIS:
            "Your total bill is 10 + d/2. If d = 14, then d/2 = 7, so your total is 10 + 7 = 17. If d = 20, then d/2 = 10, so your total is 10 + 10 = 20."
            
            NOT LIKE THIS: "Your total bill is ten plus d over two" ❌
            
            - Use phrases like "isn't this incredible?", "how cool is it that algebra helps us understand real bills?", "you're learning to solve everyday problems!"
            - Make it feel like they're becoming everyday problem solvers
            - Use energetic language with exclamation marks!
            - Connect to things they know: phone bills, data usage, money, everyday expenses
            - End with excitement about using algebra to solve more everyday problems
            
            REMEMBER: Write 10 + d/2 NOT "ten plus d over two"!
            """
            
            real_world_text = self.generate_text_with_gemini(real_world_prompt)
            print(f"📚 Real-world application explanation generated: {len(real_world_text)} characters")
            
            # Add to transcript
            self.add_to_transcript("real_world_image", real_world_text)
            
            synthesis_thread = self.synthesize_and_stream_text(real_world_text)
            synthesis_thread.join()
            print("✅ Real-world application explanation completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Q&A for real life applications
            self.handle_qa_session("real life algebra applications")
            time.sleep(1.0)
            
            # SLIDE 8: Conclusion and Preview
            print("\n📚 SLIDE 8: CONCLUSION AND PREVIEW")
            print("-" * 30)
            self.current_lecture_section = "conclusion"
            self.current_section_index = 7
            self.section_start_times["conclusion"] = datetime.now()

            ending_prompt = """
            🚨🚨🚨 BULLETPROOF MATH NOTATION RULE - ZERO TOLERANCE 🚨🚨🚨
            - MANDATORY: Use ONLY mathematical symbols: x/5, 2x = 10, x = 5, y/3 = 4, 3x = 15, x/4 = 7
            - FORBIDDEN: Word descriptions like "x over five", "two x equals ten", "x equals five", "three x equals fifteen"
            - ENFORCEMENT: Post-processing will automatically fix any violations
            - EXAMPLES: Write "x/5" NOT "x over five", Write "2x = 10" NOT "two x equals ten"
            - PENALTY: Any word descriptions will be corrected by the system
            
            Write a 10-20 line ending message for a Class 7 Mathematics lesson on Algebra Level 1: The Language of Division. The message should:
            - Congratulate the student for completing the lesson
            - Summarize the key points about algebra (fraction bar notation, variables, constants, terms, substitution, inverse operations)
            - When mentioning examples, use ONLY symbols: x/5, 20/x + 2, 2x = 10, x = 5
            - Encourage curiosity and further exploration of mathematics
            - Use energetic, positive, and motivating language
            - Make the student feel proud and excited to learn more algebra
            - End with a call to action, like "Keep solving!" or "You're an algebra expert now!"
            - Be friendly, concise, and fun
            - Mention that they're ready for Level 2: Solving Equations
            - Preview Level 2 with examples using ONLY symbols: "Next, you'll solve equations like 3x = 15 and x/4 = 7"
            - CRITICAL: Every mathematical expression MUST use symbols, never words
            """
            ending_text = self.generate_text_with_gemini(ending_prompt)
            print(f"📚 Ending lecture message generated: {len(ending_text)} characters")
            self.add_to_transcript("conclusion", ending_text)
            synthesis_thread = self.synthesize_and_stream_text(ending_text)
            synthesis_thread.join()
            print("✅ Conclusion completed!")
            
            # Wait for audio to finish
            while not self.audio_queue.empty():
                time.sleep(0.1)
            time.sleep(2.0)
            
            # Check for pause after section completion
            if not self.wait_if_paused():
                return  # Lecture was stopped while paused
            
            # Final Q&A
            self.handle_qa_session("algebra and next steps")
            time.sleep(1.0)

            print("\n🎓 Complete Algebra Level 1 lecture delivered successfully!")
            print("=" * 60)
            
            # Clear any remaining audio in queue for clean finish
            print("🧹 Clearing any remaining audio...")
            self.clear_audio_queue()
            time.sleep(1.0)  # Brief wait to ensure clean finish
            
        except KeyboardInterrupt:
            print("\n⏹️  Lecture interrupted by user")
        except Exception as e:
            print(f"\n❌ Error during lecture: {e}")
        finally:
            # Stop audio thread and update lecture state
            self.stop_audio_thread()
            with self.lecture_control_lock:
                # Ensure all sections are properly saved before marking as completed
                if self.current_section_index >= len(self.sections) - 1:
                    print("🎉 Lecture completed successfully - ensuring all sections are saved!")
                    # Make sure the final sections are in the transcript
                    if self.transcript:
                        final_sections = [entry["section"] for entry in self.transcript]
                        if "diagram_explanation" not in final_sections:
                            print("⚠️  Diagram explanation not found in transcript, adding fallback")
                            self.add_to_transcript("diagram_explanation", "Wave diagrams help us understand wave properties. The highest point is called the crest, and the lowest point is the trough. The distance between two crests is the wavelength. The height of the wave from the middle to the crest is the amplitude. More waves passing per second means higher frequency. These diagrams help us visualize how waves behave and measure their properties!")

                
                self.lecture_running = False
                # Don't increment beyond sections length to avoid index errors
    
    def close(self):
        """Clean up resources"""
        print("🧹 Cleaning up resources...")
        self.stop_audio_thread()
        self.close_audio_stream()
        if self.p:
            self.p.terminate()
        print("✅ Cleanup completed")
    
    def get_lecture_status(self):
        """Get current lecture status"""
        with self.lecture_control_lock:
            # Fixed progress calculation - add 1 to current_section_index so final section shows 100%
            progress_percentage = ((self.current_section_index + 1) / len(self.sections)) * 100 if self.sections else 0
            
            status = {
                "lecture_running": self.lecture_running,
                "lecture_paused": self.lecture_paused,
                "audio_paused": self.is_audio_paused(),
                "current_section": self.current_lecture_section,
                "current_section_index": self.current_section_index,
                "total_sections": len(self.sections),
                "progress_percentage": progress_percentage
            }
            
            # Debug logging for progress calculation
            print(f"📊 Progress Debug: section {self.current_section_index}/{len(self.sections)} = {progress_percentage:.1f}%")
            
            return status
    
    def pause_lecture(self):
        """Pause the lecture"""
        with self.lecture_control_lock:
            print(f"🔍 Pause check: lecture_running={self.lecture_running}, lecture_paused={self.lecture_paused}")
            if self.lecture_running and not self.lecture_paused:
                self.lecture_paused = True
                # Also pause the audio
                self.pause_audio()
                print("⏸️  Lecture paused")
                return True
            else:
                print(f"❌ Cannot pause: lecture_running={self.lecture_running}, lecture_paused={self.lecture_paused}")
                return False
    
    def resume_lecture(self):
        """Resume the lecture from where it was paused"""
        with self.lecture_control_lock:
            if self.lecture_running and self.lecture_paused:
                self.lecture_paused = False
                # Also resume the audio
                self.resume_audio()
                print("▶️  Lecture resumed")
                return True
            return False
    
    def is_paused(self):
        """Check if lecture is paused"""
        with self.lecture_control_lock:
            return self.lecture_paused
    
    def wait_if_paused(self):
        """Wait while lecture is paused"""
        while self.is_paused():
            time.sleep(0.5)  # Check every 500ms
            if not self.lecture_running:
                return False  # Lecture was stopped while paused
        return True  # Lecture resumed or not paused
    
    def pause_audio(self):
        """Pause audio playback"""
        with self.audio_pause_lock:
            self.audio_paused = True
            print("🔇 Audio paused")
    
    def resume_audio(self):
        """Resume audio playback"""
        with self.audio_pause_lock:
            self.audio_paused = False
            print("🔊 Audio resumed")
    
    def is_audio_paused(self):
        """Check if audio is paused"""
        with self.audio_pause_lock:
            return self.audio_paused
    
    def clear_audio_queue(self):
        """Clear the audio queue for immediate playback"""
        try:
            # Clear all items in the queue
            while not self.audio_queue.empty():
                try:
                    self.audio_queue.get_nowait()
                    self.audio_queue.task_done()
                except queue.Empty:
                    break
            print("🎵 Audio queue cleared for immediate playback")
        except Exception as e:
            print(f"❌ Error clearing audio queue: {e}")
    
    def skip_to_section(self, section_index):
        """Skip to a specific section"""
        with self.lecture_control_lock:
            if 0 <= section_index < len(self.sections):
                self.current_section_index = section_index
                self.current_lecture_section = self.sections[section_index]
                print(f"⏭️  Skipped to section {section_index}: {self.sections[section_index]}")
                return {"status": "success", "message": f"Skipped to section {section_index}"}
            else:
                return {"status": "error", "message": "Invalid section index"}
    
    # NEW: Transcript functionality
    def add_to_transcript(self, section, text, timestamp=None):
        """Add text to transcript with timestamp"""
        if timestamp is None:
            timestamp = datetime.now()
        
        with self.transcript_lock:
            transcript_entry = {
                "section": section,
                "text": text,
                "timestamp": timestamp.isoformat(),
                "section_index": self.sections.index(section) if section in self.sections else -1
            }
            self.transcript.append(transcript_entry)
            print(f"📝 Added to transcript: {section} ({len(text)} chars)")
            print(f"📊 Current transcript sections: {[entry['section'] for entry in self.transcript]}")
    
    def get_transcript(self):
        """Get the complete transcript"""
        with self.transcript_lock:
            return {
                "lecture_start_time": self.lecture_start_time.isoformat() if self.lecture_start_time else None,
                "sections": self.sections,
                "transcript": self.transcript.copy(),
                "total_entries": len(self.transcript)
            }
    
    def export_transcript(self, format="json"):
        """Export transcript in specified format"""
        transcript_data = self.get_transcript()
        
        if format == "json":
            return transcript_data
        elif format == "text":
            text_output = f"Physics Lecture Transcript\n"
            text_output += f"Started: {transcript_data['lecture_start_time']}\n"
            text_output += f"{'='*50}\n\n"
            
            for entry in transcript_data['transcript']:
                text_output += f"Section: {entry['section']}\n"
                text_output += f"Time: {entry['timestamp']}\n"
                text_output += f"{entry['text']}\n\n"
            
            return text_output
        else:
            return {"error": "Unsupported format"}
    
    def clear_transcript(self):
        """Clear the transcript"""
        with self.transcript_lock:
            self.transcript.clear()
            self.lecture_start_time = None
            self.section_start_times.clear()
            print("🗑️  Transcript cleared")
    
    # Notes functionality is now handled by database endpoints
    # The in-memory notes system has been replaced with user-specific database storage
    
    def pause_for_notes(self):
        """Pause lecture specifically for note-taking"""
        try:
            # Store current pause state
            was_paused = self.audio_paused
            
            # Pause the audio
            with self.audio_pause_lock:
                self.audio_paused = True
                self.notes_paused_state = True
            
            print("📝 Lecture paused for note-taking")
            return {"status": "success", "message": "Lecture paused for notes", "was_already_paused": was_paused}
        except Exception as e:
            print(f"❌ Error pausing for notes: {e}")
            return {"status": "error", "message": str(e)}
    
    def resume_from_notes(self):
        """Resume lecture after note-taking"""
        try:
            # Resume the audio
            with self.audio_pause_lock:
                self.audio_paused = False
                self.notes_paused_state = False
            
            print("▶️  Lecture resumed from note-taking")
            return {"status": "success", "message": "Lecture resumed from notes"}
        except Exception as e:
            print(f"❌ Error resuming from notes: {e}")
            return {"status": "error", "message": str(e)}
    
    # NEW: Flashcard Generation (Simplified)
    def generate_flashcards(self, num_cards=10):
        """Generate flashcards based on the lecture content"""
        if not self.transcript:
            return {
                "error": "No lecture content available for flashcards",
                "flashcards": []
            }
        
        try:
            # Combine all lecture content
            full_lecture_content = ""
            for entry in self.transcript:
                full_lecture_content += f"\n{entry['section']}: {entry['text']}\n"
            
            # Generate flashcards using Gemini
            flashcard_prompt = f"""
            Based on this Class 7 Mathematics lecture about algebra, create {num_cards} educational flashcards for revision.
            
            Lecture Content:
            {full_lecture_content}
            
            Create flashcards that:
            - Cover the most important concepts from the lecture
            - Are suitable for 12-13 year old students
            - Have clear, concise questions and answers
            - Include definitions, examples, and key concepts
            - Mix different types of questions (definition, example, explanation)
            - Use mathematical notation (e.g., x/5, 20/x + 2, x = 7) NOT word descriptions
            
            Format each flashcard as:
            CARD [number]:
            Q: [Question]
            A: [Answer]
            
            Make sure to cover:
            - What is algebra and algebraic notation
            - The fraction bar notation (/)
            - Variables, constants, and terms
            - Substitution and evaluation
            - Inverse operations
            - Translating word problems to algebra
            - Everyday life applications
            
            Create exactly {num_cards} flashcards.
            """
            
            flashcards_text = self.generate_text_with_gemini(flashcard_prompt)
            
            # Parse flashcards from the response
            flashcards = []
            card_sections = flashcards_text.split("CARD")
            
            for i, section in enumerate(card_sections[1:], 1):  # Skip first empty section
                lines = section.strip().split('\n')
                question = ""
                answer = ""
                
                for line in lines:
                    line = line.strip()
                    if line.startswith('Q:'):
                        question = line[2:].strip()
                    elif line.startswith('A:'):
                        answer = line[2:].strip()
                    elif question and not answer and not line.startswith(('Q:', 'A:', str(i+1))):
                        # Multi-line question
                        question += " " + line
                    elif answer and not line.startswith(('Q:', 'A:', str(i+1))):
                        # Multi-line answer
                        answer += " " + line
                
                if question and answer:
                    flashcard = {
                        "id": i,
                        "question": question.strip(),
                        "answer": answer.strip(),
                        "topic": self.categorize_flashcard_topic(question),
                        "difficulty": "beginner",
                        "subject": "Mathematics",
                        "class_level": "Class 7"
                    }
                    flashcards.append(flashcard)
            
            # If we don't have enough flashcards, generate some fallback ones
            while len(flashcards) < min(num_cards, 8):
                fallback_cards = self.generate_fallback_flashcards()
                for card in fallback_cards:
                    if len(flashcards) < num_cards:
                        card["id"] = len(flashcards) + 1
                        flashcards.append(card)
            
            flashcard_set = {
                "title": "Algebra Level 1 - Revision Flashcards",
                "class_level": "Class 7",
                "subject": "Mathematics",
                "topic": "Algebra - The Language of Division",
                "total_cards": len(flashcards),
                "flashcards": flashcards[:num_cards],  # Limit to requested number
                "generated_at": datetime.now().isoformat(),
                "difficulty_level": "beginner"
            }
            
            print(f"🎴 Generated {len(flashcards)} flashcards successfully")
            return flashcard_set
            
        except Exception as e:
            print(f"❌ Error generating flashcards: {e}")
            return {
                "error": f"Failed to generate flashcards: {str(e)}",
                "flashcards": []
            }
    
    def categorize_flashcard_topic(self, question):
        """Categorize flashcard based on question content"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ['definition', 'what is', 'what are']):
            return "definitions"
        elif any(word in question_lower for word in ['example', 'real life', 'everyday', 'word problem']):
            return "examples"
        elif any(word in question_lower for word in ['variable', 'constant', 'term', 'vocabulary']):
            return "algebra_vocabulary"
        elif any(word in question_lower for word in ['fraction bar', 'notation', '/', 'division']):
            return "notation"
        elif any(word in question_lower for word in ['substitution', 'evaluate', 'substitute']):
            return "substitution"
        elif any(word in question_lower for word in ['inverse', 'undo', 'opposite']):
            return "inverse_operations"
        else:
            return "general"
    
    def generate_fallback_flashcards(self):
        """Generate fallback flashcards if AI generation fails"""
        return [
            {
                "question": "What is algebra?",
                "answer": "Algebra is the language of mathematics that uses letters and symbols to represent numbers and relationships.",
                "topic": "definitions"
            },
            {
                "question": "What does the fraction bar (/) mean in algebra?",
                "answer": "The fraction bar means division. For example, x/5 means x divided by 5.",
                "topic": "notation"
            },
            {
                "question": "What is a variable in algebra?",
                "answer": "A variable is a letter (like x or y) that represents an unknown number or value that can change.",
                "topic": "algebra_vocabulary"
            },
            {
                "question": "What is a constant?",
                "answer": "A constant is a number that never changes, like 5, 10, or 3.14.",
                "topic": "algebra_vocabulary"
            },
            {
                "question": "If x = 5, what is 20/x + 2?",
                "answer": "First substitute: 20/5 + 2. Then calculate: 4 + 2 = 6.",
                "topic": "substitution"
            },
            {
                "question": "What is the inverse operation of multiplication?",
                "answer": "Division is the inverse of multiplication. If you multiply by 3, you divide by 3 to undo it.",
                "topic": "inverse_operations"
            },
            {
                "question": "Give an example of algebra in everyday life.",
                "answer": "Calculating your total restaurant bill: If your meal costs 10 and you split a dessert of d with your friend, your total is 10 + d/2.",
                "topic": "examples"
            },
            {
                "question": "How do you write '20 divided by x plus 2' in algebraic notation?",
                "answer": "20/x + 2",
                "topic": "notation"
            }
        ]
    
    def generate_quiz(self, num_questions=10):
        """Generate an AI-powered quiz with multiple-choice questions and explanations."""
        if not self.transcript:
            return {
                "error": "No lecture content available for quiz",
                "quiz": []
            }
        try:
            # Combine all lecture content
            full_lecture_content = ""
            for entry in self.transcript:
                full_lecture_content += f"\n{entry['section']}: {entry['text']}\n"

            # Prompt for Gemini
            quiz_prompt = f"""
            Based on this Class 7 Mathematics lecture about algebra, create a quiz with {num_questions} multiple-choice questions.

            Requirements:
            - Each question should have 4 options (A, B, C, D).
            - The quiz should start easy and get harder (Q1 easiest, Q{num_questions} hardest).
            - Use mathematical notation (e.g., x/5, 20/x + 2, x = 7) NOT word descriptions like "x over 5"
            - For each question, provide:
                * The question text
                * Four options (A, B, C, D)
                * The correct option (A/B/C/D)
                * An explanation for why the correct answer is right
                * An explanation for why each incorrect option is wrong
            - Explanations should be clear and suitable for a 12-13 year old.
            - Do NOT repeat the question in the explanations.
            - Use this format for each question:

            QUESTION [number]:
            Q: [Question text]
            A: [Option A]
            B: [Option B]
            C: [Option C]
            D: [Option D]
            ANSWER: [A/B/C/D]
            EXPLAIN_CORRECT: [Why the correct answer is right]
            EXPLAIN_A: [Why A is right or wrong]
            EXPLAIN_B: [Why B is right or wrong]
            EXPLAIN_C: [Why C is right or wrong]
            EXPLAIN_D: [Why D is right or wrong]

            Lecture Content:
            {full_lecture_content}

            Create exactly {num_questions} questions.
            """

            quiz_text = self.generate_text_with_gemini(quiz_prompt)

            # Parse quiz
            quiz = []
            question_blocks = quiz_text.split("QUESTION")
            for i, block in enumerate(question_blocks[1:], 1):
                lines = block.strip().split('\n')
                q, opts, ans, explain_correct = '', {}, '', ''
                explanations = {}
                for line in lines:
                    if line.startswith('Q:'):
                        q = line[2:].strip()
                    elif line.startswith('A:'):
                        opts['A'] = line[2:].strip()
                    elif line.startswith('B:'):
                        opts['B'] = line[2:].strip()
                    elif line.startswith('C:'):
                        opts['C'] = line[2:].strip()
                    elif line.startswith('D:'):
                        opts['D'] = line[2:].strip()
                    elif line.startswith('ANSWER:'):
                        ans = line.split(':',1)[1].strip()
                    elif line.startswith('EXPLAIN_CORRECT:'):
                        explain_correct = line.split(':',1)[1].strip()
                    elif line.startswith('EXPLAIN_A:'):
                        explanations['A'] = line.split(':',1)[1].strip()
                    elif line.startswith('EXPLAIN_B:'):
                        explanations['B'] = line.split(':',1)[1].strip()
                    elif line.startswith('EXPLAIN_C:'):
                        explanations['C'] = line.split(':',1)[1].strip()
                    elif line.startswith('EXPLAIN_D:'):
                        explanations['D'] = line.split(':',1)[1].strip()
                if q and opts and ans:
                    quiz.append({
                        "id": i,
                        "question": q,
                        "options": [opts.get('A',''), opts.get('B',''), opts.get('C',''), opts.get('D','')],
                        "option_labels": ['A','B','C','D'],
                        "correct_option": ans,
                        "explanations": explanations,
                        "explain_correct": explain_correct
                    })
            return {
                "title": "Algebra Level 1 - AI Quiz",
                "class_level": "Class 7",
                "subject": "Mathematics",
                "topic": "Algebra - The Language of Division",
                "total_questions": len(quiz),
                "quiz": quiz[:num_questions],
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"❌ Error generating quiz: {e}")
            return {
                "error": f"Failed to generate quiz: {str(e)}",
                "quiz": []
            }

    def generate_qa_transcript(self):
        """Generate a transcript of Q&A interactions"""
        try:
            qa_transcript = []
            
            # Get all Q&A interactions from the transcript
            for entry in self.transcript:
                if "Q&A" in entry.get("section", ""):
                    qa_transcript.append({
                        "section": entry["section"],
                        "text": entry["text"],
                        "timestamp": entry["timestamp"],
                        "section_index": entry["section_index"],
                        "type": "qa"
                    })
            
            return {
                "status": "success",
                "data": {
                    "qa_transcript": qa_transcript,
                    "total_entries": len(qa_transcript)
                }
            }
            
        except Exception as e:
            print(f"❌ Error generating Q&A transcript: {e}")
            return {
                "status": "error",
                "message": f"Failed to generate Q&A transcript: {str(e)}",
                "data": {
                    "qa_transcript": [],
                    "total_entries": 0
                }
            }



def main():
    """Main function to run the physics lecture"""
    # You can set your Gemini API credentials here
    GEMINI_API_KEY = "AIzaSyCBI-2UyqWJg6mMpG10NB_QfUVKgknNS5g"
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
    
    print("🎓 Physics Lecture Streaming System")
    print("=" * 50)
    
    # Create lecture streamer
    lecture_streamer = AlgebraLectureStreamer(
        gemini_api_key=GEMINI_API_KEY,
        gemini_url=GEMINI_URL
    )
    
    # Use original recommended voice (no options needed)
    print("\n✅ Using original recommended voice")
    
    # Q&A sessions always enabled
    lecture_streamer.enable_qa()
    print("✅ Q&A sessions enabled (text input only)")
    
    try:
        # Deliver the complete lecture
        lecture_streamer.deliver_full_lecture()
        
    except KeyboardInterrupt:
        print("\n⏹️  Lecture stopped by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        lecture_streamer.close()

# Flask App Integration
try:
    from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, APIRouter, Depends, status
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from pydantic import BaseModel
    import uvicorn
    import threading
    import time
    import queue
    import json
    from typing import List
    from datetime import datetime, timedelta
    import jwt
    from auth import get_current_user_token, TokenData, get_current_user_data
    from config import supabase, SECRET_KEY, ALGORITHM
    
    # Create router for FastAPI
    router = APIRouter(prefix="/api/lectures/class7/mathematics/algebra/level1", tags=["mathematics-lecture"])
    
    # Global variables for FastAPI app
    app = FastAPI(
        title="Physics Lecture Streaming API",
        description="API for streaming physics lectures with real-time Q&A",
        version="1.0.0"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include the router
    app.include_router(router)
    
    # WebSocket connection manager
    class ConnectionManager:
        def __init__(self):
            self.active_connections: List[WebSocket] = []
        
        async def connect(self, websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)
            print(f"Client connected. Total connections: {len(self.active_connections)}")
        
        def disconnect(self, websocket: WebSocket):
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total connections: {len(self.active_connections)}")
        
        async def send_personal_message(self, message: str, websocket: WebSocket):
            await websocket.send_text(message)
        
        async def broadcast(self, message: str):
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except:
                    # Remove dead connections
                    self.active_connections.remove(connection)
    
    manager = ConnectionManager()
    
    # Global variable to store the lecture streamer instance
    lecture_streamer = None
    lecture_thread = None
    is_lecture_running = False
    
    # Queue for Q&A responses from frontend
    qa_response_queue = queue.Queue()
    
    # Pydantic models for request/response
    class LectureRequest(BaseModel):
        gemini_api_key: str = "AIzaSyCBI-2UyqWJg6mMpG10NB_QfUVKgknNS5g"
        gemini_url: str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
    
    class LectureResponse(BaseModel):
        status: str
        message: str
        lecture_status: str = None
    
    class NoteRequest(BaseModel):
        content: str
        lecture_section: Optional[str] = None
    
    class NoteUpdateRequest(BaseModel):
        note_id: str
        content: str
    
    class NoteDeleteRequest(BaseModel):
        note_id: str
    
    @router.get("/")
    async def home():
        """Home endpoint"""
        return {
            "message": "Physics Lecture Streaming API with Revision Tools",
            "endpoints": {
                "/start-lecture": "POST - Start the physics lecture",
                "/stop-lecture": "POST - Stop the running lecture",
                "/lecture-status": "GET - Get detailed lecture status and progress",
                "/skip-to-section": "POST - Skip to a specific section",
                "/transcript": "GET - Get the complete lecture transcript",
                "/export-transcript": "GET - Export transcript in JSON or text format",
                "/clear-transcript": "POST - Clear the lecture transcript",
                "/flashcards": "GET - Generate flashcards (default 10, max 20)",
                "/change-voice": "POST - Change TTS voice (male/female)",
                "/enable-qa": "POST - Enable Q&A sessions",
                "/disable-qa": "POST - Disable Q&A sessions",
                "/notes/pause": "POST - Pause lecture for note-taking",
                "/notes/resume": "POST - Resume lecture after note-taking",
                "/notes/add": "POST - Add a new note",
                "/notes": "GET - Get all notes",
                "/notes/update": "PUT - Update an existing note",
                "/notes/delete": "DELETE - Delete a note",
                "/notes/clear": "POST - Clear all notes",
                "/docs": "GET - API documentation (Swagger UI)",
                "/redoc": "GET - Alternative API documentation",
                "/ws": "WebSocket endpoint for real-time communication",
                "/quiz": "GET - Generate AI-powered quiz",
                "/qa-transcript": "GET - Get Q&A transcript"
            },
            "flashcard_features": {
                "ai_generated": "Intelligent flashcards based on actual lecture content",
                "interactive_ui": "Beautiful flip animations and navigation",
                "adaptive_content": "Questions and answers tailored to Class 7 students"
            }
        }
    
    @router.get("/status")
    async def get_lecture_status():
        """Get current lecture status"""
        return {
            "status": "success",
            "data": {
                "is_running": is_lecture_running,
                "has_streamer": lecture_streamer is not None
            }
        }
    
    @router.post("/stop-lecture")
    async def stop_lecture():
        """Stop the physics lecture"""
        global lecture_streamer, is_lecture_running
        
        print(f"🔍 Stop lecture request received. Current status: is_lecture_running={is_lecture_running}")
        
        if not is_lecture_running:
            print("❌ No lecture is currently running, returning 400 error")
            raise HTTPException(status_code=400, detail="No lecture is currently running")
        
        try:
            print("✅ Stopping lecture...")
            is_lecture_running = False
            if lecture_streamer:
                lecture_streamer.close()
                # DO NOT set lecture_streamer = None - keep it for quiz/flashcard generation
                print("✅ Lecture streamer closed but kept for revision tools")
            
            print("✅ Lecture stopped successfully")
            return {
                "status": "success",
                "message": "Physics lecture stopped successfully"
            }
            
        except Exception as e:
            print(f"❌ Error stopping lecture: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to stop lecture: {str(e)}")

    @router.post("/reset-lecture")
    async def reset_lecture():
        """Force reset lecture state (for debugging)"""
        global lecture_streamer, is_lecture_running, lecture_thread
        
        print("🔄 Force resetting lecture state...")
        
        # Stop any running lecture
        is_lecture_running = False
        if lecture_streamer:
            lecture_streamer.close()
            lecture_streamer = None
            print("✅ Lecture streamer closed")
        
        # Reset thread
        lecture_thread = None
        
        print("✅ Lecture state reset successfully")
        return {
            "status": "success",
            "message": "Lecture state reset successfully"
        }
    
    @router.post("/start-lecture", response_model=LectureResponse)
    async def start_lecture(request: LectureRequest):
        """Start the physics lecture"""
        global lecture_streamer, lecture_thread, is_lecture_running
        
        print(f"🔍 Start lecture request received. Current status: is_lecture_running={is_lecture_running}")
        print(f"📝 Request data: gemini_api_key={request.gemini_api_key[:20]}..., gemini_url={request.gemini_url}")
        
        if is_lecture_running:
            print("❌ Lecture is already running, returning 400 error")
            raise HTTPException(status_code=400, detail="Lecture is already running")
        
        try:
            print("✅ Creating new PhysicsLectureStreamer...")
            # Create lecture streamer
            lecture_streamer = AlgebraLectureStreamer(
                gemini_api_key=request.gemini_api_key,
                gemini_url=request.gemini_url
            )
            
            print("✅ Lecture streamer created successfully")
            
            # Enable Q&A sessions
            lecture_streamer.enable_qa()
            print("✅ Q&A sessions enabled")
            
            # Start lecture in a separate thread
            is_lecture_running = True
            print("✅ Setting is_lecture_running to True")
            
            lecture_thread = threading.Thread(target=run_lecture, daemon=True)
            print("✅ Lecture thread created")
            
            lecture_thread.start()
            print("✅ Lecture thread started")
            
            print("✅ Lecture started successfully")
            return LectureResponse(
                status="success",
                message="Physics lecture started successfully",
                lecture_status="running"
            )
            
        except Exception as e:
            print(f"❌ Error starting lecture: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to start lecture: {str(e)}")
    
    @router.post("/change-voice")
    async def change_voice(request: dict):
        """Change voice type"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            voice_type = request.get("voice_type", "female")
            if voice_type.lower() == "female":
                success = lecture_streamer.change_voice_to_female()
            elif voice_type.lower() == "male":
                success = lecture_streamer.change_voice_to_male()
            else:
                raise HTTPException(status_code=400, detail="Voice type must be 'female' or 'male'")
            
            return {
                "status": "success",
                "message": f"Voice changed to {voice_type}",
                "data": {
                    "voice_type": voice_type,
                    "success": success
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error changing voice: {str(e)}")
    
    @router.post("/enable-qa")
    async def enable_qa():
        """Enable Q&A sessions"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            lecture_streamer.enable_qa()
            
            return {
                "status": "success",
                "message": "Q&A sessions enabled",
                "data": {
                    "qa_enabled": True
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error enabling Q&A: {str(e)}")
    
    @router.post("/disable-qa")
    async def disable_qa():
        """Disable Q&A sessions"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            lecture_streamer.disable_qa()
            
            return {
                "status": "success",
                "message": "Q&A sessions disabled",
                "data": {
                    "qa_enabled": False
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error disabling Q&A: {str(e)}")
    
    @router.post("/pause-lecture")
    async def pause_lecture():
        """Pause the physics lecture"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            success = lecture_streamer.pause_lecture()
            if success:
                return {
                    "status": "success",
                    "message": "Lecture paused successfully"
                }
            else:
                raise HTTPException(status_code=400, detail="Cannot pause lecture - not running or already paused")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error pausing lecture: {str(e)}")
    
    @router.post("/resume-lecture")
    async def resume_lecture():
        """Resume the physics lecture from where it was paused"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            success = lecture_streamer.resume_lecture()
            if success:
                return {
                    "status": "success",
                    "message": "Lecture resumed successfully"
                }
            else:
                raise HTTPException(status_code=400, detail="Cannot resume lecture - not running or not paused")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error resuming lecture: {str(e)}")
    
    # NEW: Notes API Endpoints
    @router.post("/notes/pause")
    async def pause_for_notes():
        """Pause lecture for note-taking"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            result = lecture_streamer.pause_for_notes()
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error pausing for notes: {str(e)}")
    
    @router.post("/notes/resume")
    async def resume_from_notes():
        """Resume lecture after note-taking"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            result = lecture_streamer.resume_from_notes()
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error resuming from notes: {str(e)}")
    
    @router.post("/notes/add")
    async def add_note(
        note_request: NoteRequest,
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Add a new note"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get current lecture section if available
            current_section = getattr(lecture_streamer, 'current_lecture_section', None)
            lecture_section = note_request.lecture_section if note_request.lecture_section else current_section
            
            # Save note to database
            note_data = {
                "user_id": user_data.id,
                "content": note_request.content,
                "lecture_type": "mathematics_algebra_level1",
                "lecture_section": lecture_section,
                "lecture_timestamp": datetime.now().isoformat()
            }
            
            print(f"📝 [Lecture] Adding note: {note_data}")
            result = supabase_service.table("user_notes").insert(note_data).execute()
            print(f"📋 [Lecture] Database result: {result}")
            
            if result.data:
                return {
                    "status": "success",
                    "message": "Note added successfully",
                    "note": result.data[0]
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save note")
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error adding note: {str(e)}")
    
    @router.get("/notes")
    async def get_notes(
        section: str = None,
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Get all notes for the current user, optionally filtered by section"""
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Build query
            query = supabase_service.table("user_notes").select("*").eq("user_id", user_data.id).eq("lecture_type", "mathematics_algebra_level1").eq("is_active", True)
            
            # Add section filter if provided
            if section:
                query = query.eq("lecture_section", section)
            
            result = query.order("created_at", desc=True).execute()
            
            return {
                "status": "success",
                "data": {
                    "notes": result.data if result.data else [],
                    "total_notes": len(result.data) if result.data else 0,
                    "user_id": user_data.id,
                    "filtered_by_section": section
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting notes: {str(e)}")
    
    @router.get("/notes/by-sections")
    async def get_notes_by_sections(
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Get user's notes organized by lecture sections"""
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get user's notes for this lecture type
            result = supabase_service.table("user_notes").select("*").eq("user_id", user_data.id).eq("lecture_type", "mathematics_algebra_level1").eq("is_active", True).order("created_at", desc=True).execute()
            
            # Organize notes by section
            notes_by_section = {}
            total_notes = 0
            
            if result.data:
                for note in result.data:
                    section = note.get('lecture_section', 'general')
                    if section not in notes_by_section:
                        notes_by_section[section] = []
                    notes_by_section[section].append(note)
                    total_notes += 1
            
            return {
                "status": "success",
                "data": {
                    "notes_by_section": notes_by_section,
                    "total_notes": total_notes,
                    "sections": list(notes_by_section.keys()),
                    "user_id": user_data.id
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting notes by sections: {str(e)}")
    
    @router.put("/notes/update")
    async def update_note(
        note_update: NoteUpdateRequest,
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Update an existing note"""
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Update note in database (RLS will ensure user can only update their own notes)
            result = supabase_service.table("user_notes").update({
                "content": note_update.content,
                "updated_at": datetime.now().isoformat()
            }).eq("id", note_update.note_id).eq("user_id", user_data.id).execute()
            
            if result.data:
                return {
                    "status": "success",
                    "message": "Note updated successfully",
                    "note": result.data[0]
                }
            else:
                raise HTTPException(status_code=404, detail="Note not found or you don't have permission to update it")
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")
    
    @router.delete("/notes/delete")
    async def delete_note(
        note_delete: NoteDeleteRequest,
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Delete a note (soft delete)"""
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Soft delete note in database (RLS will ensure user can only delete their own notes)
            result = supabase_service.table("user_notes").update({
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("id", note_delete.note_id).eq("user_id", user_data.id).execute()
            
            if result.data:
                return {
                    "status": "success",
                    "message": "Note deleted successfully",
                    "deleted_note": result.data[0]
                }
            else:
                raise HTTPException(status_code=404, detail="Note not found or you don't have permission to delete it")
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")
    
    @router.post("/notes/clear")
    async def clear_notes(
        token_data: TokenData = Depends(get_current_user_token)
    ):
        """Clear all notes for the current user"""
        try:
            # Get user data
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Soft delete all user's notes for this lecture type
            result = supabase_service.table("user_notes").update({
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("user_id", user_data.id).eq("lecture_type", "mathematics_algebra_level1").eq("is_active", True).execute()
            
            notes_cleared = len(result.data) if result.data else 0
            
            return {
                "status": "success",
                "message": f"All {notes_cleared} notes cleared successfully"
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error clearing notes: {str(e)}")
    
    @router.get("/lecture-status")
    async def get_detailed_lecture_status():
        """Get detailed lecture status and progress"""
        global lecture_streamer
        
        if not lecture_streamer:
            return {
                "status": "success",
                "data": {
                    "lecture_running": False,
                    "lecture_paused": False,
                    "audio_paused": False,
                    "current_section": None,
                    "current_section_index": 0,
                    "total_sections": 8,
                    "progress_percentage": 0
                }
            }
        
        try:
            status = lecture_streamer.get_lecture_status()
            return {
                "status": "success",
                "data": status
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting lecture status: {str(e)}")
    
    @router.post("/skip-to-section")
    async def skip_to_section(request: dict):
        """Skip to a specific section"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            section_index = request.get("section_index")
            if section_index is None:
                raise HTTPException(status_code=400, detail="section_index is required")
            
            result = lecture_streamer.skip_to_section(section_index)
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error skipping to section: {str(e)}")
    
    # NEW: Transcript endpoints
    @router.get("/transcript")
    async def get_transcript():
        """Get the complete lecture transcript"""
        global lecture_streamer
        
        if not lecture_streamer:
            return {
                "status": "success",
                "data": {
                    "lecture_start_time": None,
                    "sections": [],
                    "transcript": [],
                    "total_entries": 0
                }
            }
        
        try:
            transcript = lecture_streamer.get_transcript()
            return {
                "status": "success",
                "data": transcript
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting transcript: {str(e)}")
    
    @router.get("/export-transcript")
    async def export_transcript(format: str = "json"):
        """Export transcript in specified format"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            if format not in ["json", "text"]:
                raise HTTPException(status_code=400, detail="Format must be 'json' or 'text'")
            
            transcript = lecture_streamer.export_transcript(format)
            return {
                "status": "success",
                "data": transcript
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error exporting transcript: {str(e)}")
    
    @router.post("/clear-transcript")
    async def clear_transcript():
        """Clear the lecture transcript"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            lecture_streamer.clear_transcript()
            return {
                "status": "success",
                "message": "Transcript cleared successfully"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error clearing transcript: {str(e)}")
    
    @router.post("/generate-text")
    async def generate_text(request: dict):
        """Generate text using Gemini AI"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            prompt = request.get("prompt", "")
            generated_text = lecture_streamer.generate_text_with_gemini(prompt)
            
            return {
                "status": "success",
                "message": "Text generated successfully",
                "data": {
                    "generated_text": generated_text,
                    "prompt": prompt
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")
    
    @router.post("/synthesize-text")
    async def synthesize_text(request: dict):
        """Synthesize and stream text"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            text = request.get("text", "")
            synthesis_thread = lecture_streamer.synthesize_and_stream_text(text)
            
            return {
                "status": "success",
                "message": "Text synthesized and streaming",
                "data": {
                    "text": text,
                    "synthesis_started": True,
                    "thread_id": str(synthesis_thread.ident) if synthesis_thread else None
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error synthesizing text: {str(e)}")
    
    # NEW: Flashcard Endpoint (Simplified)
    @router.get("/flashcards")
    async def get_flashcards(num_cards: int = 10):
        """Generate flashcards based on lecture content"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            # Validate number of cards
            if num_cards < 1 or num_cards > 20:
                raise HTTPException(status_code=400, detail="Number of cards must be between 1 and 20")
            
            flashcards = lecture_streamer.generate_flashcards(num_cards)
            
            return {
                "status": "success",
                "message": f"Generated {flashcards.get('total_cards', 0)} flashcards successfully",
                "data": flashcards
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")
    
    @router.get("/quiz")
    async def get_quiz(num_questions: int = 10):
        """Generate an AI-powered quiz based on lecture content"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            if num_questions < 1 or num_questions > 20:
                raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20")
            
            quiz = lecture_streamer.generate_quiz(num_questions)
            
            return {
                "status": "success",
                "message": f"Generated {quiz.get('total_questions', 0)} quiz questions successfully",
                "data": quiz
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")
    
    # NEW: Diagram endpoints
    @router.get("/diagram-status")
    async def get_diagram_status():
        """Get current diagram display status"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            diagram_info = getattr(lecture_streamer, 'current_diagram_info', None)
            current_section = getattr(lecture_streamer, 'current_lecture_section', None)
            
            return {
                "status": "success",
                "data": {
                    "has_diagram": diagram_info is not None,
                    "current_section": current_section,
                    "diagram_info": diagram_info,
                    "should_show_overlay": (current_section == "diagram_explanation" or 
                                           current_section == "substitution_image" or 
                                           current_section == "word_problem_image" or 
                                           current_section == "real_world_image" or 
                                           current_section == "algebraic_vocabulary") and diagram_info is not None
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting diagram status: {str(e)}")
    
    @router.get("/diagram-image/{image_filename}")
    async def get_diagram_image(image_filename: str):
        """Serve the diagram image file"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture streamer available")
        
        try:
            from fastapi.responses import FileResponse
            import os
            
            # Use the configured images folder
            image_path = os.path.join(lecture_streamer.images_folder, image_filename)
            
            if not os.path.exists(image_path):
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Verify it's a valid image file
            valid_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg']
            if not any(image_filename.lower().endswith(ext) for ext in valid_extensions):
                raise HTTPException(status_code=400, detail="Invalid image format")
            
            return FileResponse(
                image_path,
                media_type="image/png",
                filename=image_filename
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")
    
    @router.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    message_type = message.get("type")
                    
                    if message_type == "qa_response":
                        response = message.get("response", "")
                        print(f"Received Q&A response: {response}")
                        qa_response_queue.put(response)
                    elif message_type == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    
                except json.JSONDecodeError:
                    print(f"Invalid JSON received: {data}")
                    
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception as e:
            print(f"WebSocket error: {e}")
            manager.disconnect(websocket)
    
    def get_qa_response_from_frontend(prompt):
        """Get Q&A response from frontend instead of console input"""
        # Send the prompt to frontend via WebSocket
        message = {
            "type": "qa_prompt",
            "prompt": prompt,
            "qa_type": "yes_no" if 'yes' in prompt.lower() or 'no' in prompt.lower() else "question"
        }
        
        # Broadcast to all connected clients
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        loop.run_until_complete(manager.broadcast(json.dumps(message)))
        
        # Wait for response from frontend
        try:
            response = qa_response_queue.get(timeout=60)  # 60 second timeout
            return response.strip().lower()
        except queue.Empty:
            print("Timeout waiting for frontend response, defaulting to 'no'")
            return 'no'
    
    def run_lecture():
        """Run the lecture in a separate thread"""
        global lecture_streamer, is_lecture_running
        
        try:
            print("🎓 Starting physics lecture via API...")
            print(f"🔍 Debug: lecture_streamer = {lecture_streamer}")
            print(f"🔍 Debug: is_lecture_running = {is_lecture_running}")
            
            if not lecture_streamer:
                print("❌ Error: lecture_streamer is None!")
                return
            
            # Override the input function to use frontend
            import builtins
            original_input = builtins.input
            
            def frontend_input(prompt=""):
                return get_qa_response_from_frontend(prompt)
            
            builtins.input = frontend_input
            
            print("✅ About to call deliver_full_lecture()...")
            lecture_streamer.deliver_full_lecture()
            print("✅ deliver_full_lecture() completed successfully")
            
            # Restore original input function
            builtins.input = original_input
            
            # After lecture completion, ensure proper state
            print("🎉 Lecture delivery completed!")
            
        except Exception as e:
            print(f"❌ Error during lecture: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Mark as not running and clean up
            print("🧹 Cleaning up lecture state...")
            is_lecture_running = False
            if lecture_streamer:
                # Keep the streamer alive for flashcard generation, just mark as not running
                with lecture_streamer.lecture_control_lock:
                    lecture_streamer.lecture_running = False
                print("✅ Lecture marked as completed - ready for flashcard generation!")
                # Don't close the streamer yet - we need it for flashcards
            else:
                print("⚠️  Lecture streamer was None during cleanup")
    
    def run_web_server():
        """Run the FastAPI web server"""
        print("🚀 Starting Physics Lecture Streaming API with Revision Tools...")
        print("📚 Core Lecture Endpoints:")
        print("   - POST /start-lecture - Start the physics lecture")
        print("   - POST /stop-lecture - Stop the running lecture")
        print("   - GET  /lecture-status - Get lecture progress")
        print("   - WS   /ws - WebSocket for real-time Q&A")
        print("🎴 NEW: Revision & Study Tools:")
        print("   - GET  /lecture-summary - AI-generated summary")
        print("   - GET  /flashcards?num_cards=10 - Generate flashcards")
        print("   - GET  /revision-package - Complete study package")
        print("   - POST /generate-custom-flashcards - Topic-specific cards")
        print("📖 Documentation:")
        print("   - GET  / - API information")
        print("   - GET  /docs - Interactive API documentation")
        print("   - GET  /redoc - Alternative API documentation")
        print("🔌 WebSocket events:")
        print("   - qa_prompt - Receive Q&A prompts")
        print("   - qa_response - Send Q&A responses")
        print("=" * 60)
        
        uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
    
    # Only run as web server - no automatic lecture start
    print("🚀 Physics Lecture API with Revision Tools Ready!")
    print("📚 Core Lecture Endpoints:")
    print("   - POST /start-lecture - Start the physics lecture")
    print("   - POST /stop-lecture - Stop the running lecture")
    print("   - GET  /lecture-status - Get lecture progress")
    print("   - WS   /ws - WebSocket for real-time Q&A")
    print("🎴 NEW: Revision & Study Tools:")
    print("   - GET  /lecture-summary - AI-generated summary")
    print("   - GET  /flashcards?num_cards=10 - Generate flashcards")
    print("   - GET  /revision-package - Complete study package")
    print("   - POST /generate-custom-flashcards - Topic-specific cards")
    print("📖 Documentation:")
    print("   - GET  / - API information")
    print("   - GET  /docs - Interactive API documentation")
    print("   - GET  /redoc - Alternative API documentation")
    print("🔌 WebSocket events:")
    print("   - qa_prompt - Receive Q&A prompts")
    print("   - qa_response - Send Q&A responses")
    print("=" * 60)
    print("💡 The lecture will only start when you click 'Start Lecture' in the frontend!")
    print("🎓 After lecture completion, use revision tools to generate summary & flashcards!")
    print("🌐 Access the frontend at: http://localhost:5173/ai-teacher/class7/science/physics/waves/level1")
    
    @router.get("/qa-transcript")
    async def get_qa_transcript():
        """Get Q&A transcript"""
        global lecture_streamer
        
        if not lecture_streamer:
            return {
                "status": "success",
                "data": {
                    "qa_transcript": [],
                    "total_entries": 0
                }
            }
        
        try:
            qa_transcript = lecture_streamer.generate_qa_transcript()
            return qa_transcript
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error getting Q&A transcript: {str(e)}")
    
    @router.post("/save-lecture")
    async def save_lecture(user_id: str):
        """Save lecture transcript and Q&A responses for a user"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture content available")
        
        try:
            # Get transcript and Q&A data
            transcript_data = lecture_streamer.get_transcript()
            qa_data = lecture_streamer.generate_qa_transcript()
            
            # Format data for saving
            lecture_data = {
                "user_id": user_id,
                "title": "Algebra - Level 1: The Language of Division",
                "subject": "Mathematics",
                "class_level": "Class 7",
                "topic": "Algebra - The Language of Division",
                "saved_at": datetime.now().isoformat(),
                "transcript": transcript_data,
                "qa_interactions": qa_data.get("data", {}).get("qa_transcript", []),
                "sections": lecture_streamer.sections,
                "total_sections": len(lecture_streamer.sections)
            }
            
            # Save to database
            try:
                result = supabase.table("saved_lectures").insert(lecture_data).execute()
                
                return {
                    "status": "success",
                    "message": "Lecture saved successfully",
                    "data": {
                        "lecture_id": result.data[0]["id"] if result.data else None,
                        "saved_at": lecture_data["saved_at"]
                    }
                }
                
            except Exception as db_error:
                print(f"Database error: {db_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save lecture: {str(db_error)}"
                )
                
        except Exception as e:
            print(f"Error saving lecture: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error saving lecture: {str(e)}"
            )

    @router.get("/saved-lectures/{user_email}")
    async def get_saved_lectures(user_email: str):
        """Get all saved lectures for a user"""
        try:
            result = supabase.table("saved_lectures").select("*").eq("user_email", user_email).execute()
            
            return {
                "status": "success",
                "data": {
                    "lectures": result.data,
                    "total_lectures": len(result.data)
                }
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching saved lectures: {str(e)}"
            )

    @router.get("/saved-lecture/{lecture_id}")
    async def get_saved_lecture(lecture_id: str):
        """Get a specific saved lecture"""
        try:
            result = supabase.table("saved_lectures").select("*").eq("id", lecture_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Lecture not found")
            
            return {
                "status": "success",
                "data": result.data[0]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching lecture: {str(e)}"
            )
    
    # Using get_current_user_token from auth.py

    @router.post("/save-current-lecture")
    async def save_current_lecture(token_data: TokenData = Depends(get_current_user_token), credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
        """Save the current lecture for the user"""
        global lecture_streamer
        
        if not lecture_streamer:
            raise HTTPException(status_code=400, detail="No lecture content available")
        
        try:
            # Get user data using the existing function
            user_data = await get_current_user_data(token_data)
            if not user_data:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get transcript, Q&A data, and diagram info
            transcript_data = lecture_streamer.get_transcript()
            qa_data = lecture_streamer.generate_qa_transcript()
            diagram_info = getattr(lecture_streamer, 'current_diagram_info', None)
            
            # Enhanced diagram info with image data
            enhanced_diagram_info = None
            if diagram_info:
                try:
                    import base64
                    import os
                    
                    # Get the image path from diagram info
                    image_path = diagram_info.get('image_path')
                    if image_path and os.path.exists(image_path):
                        # Read the image file and encode it as base64
                        with open(image_path, 'rb') as image_file:
                            image_data = image_file.read()
                            image_base64 = base64.b64encode(image_data).decode('utf-8')
                        
                        enhanced_diagram_info = {
                            **diagram_info,
                            'image_base64': image_base64,
                            'image_size': len(image_data),
                            'image_url': f"/diagram-image/{diagram_info.get('image_filename', '')}"
                        }
                        print(f"🖼️  Enhanced diagram info with image data ({len(image_data)} bytes)")
                    else:
                        enhanced_diagram_info = diagram_info
                        print("⚠️  Diagram image file not found, using basic diagram info")
                except Exception as e:
                    print(f"❌ Error processing diagram image: {e}")
                    enhanced_diagram_info = diagram_info
            
            # Debug: Check what sections are in the transcript
            if transcript_data and "transcript" in transcript_data:
                transcript_sections = [entry.get("section", "") for entry in transcript_data["transcript"]]
                print(f"🔍 Transcript sections before saving: {transcript_sections}")
                print(f"🔍 Expected sections: {lecture_streamer.sections}")
                
                # Ensure diagram explanation and ending are present
                if "diagram_explanation" not in transcript_sections:
                    print("⚠️  Diagram explanation missing, adding fallback")
                    lecture_streamer.add_to_transcript("diagram_explanation", "Wave diagrams help us understand wave properties. The highest point is called the crest, and the lowest point is the trough. The distance between two crests is the wavelength. The height of the wave from the middle to the crest is the amplitude. More waves passing per second means higher frequency. These diagrams help us visualize how waves behave and measure their properties!")
                

                
                # Get updated transcript after adding missing sections
                transcript_data = lecture_streamer.get_transcript()
            
            # Format data for saving
            lecture_data = {
                "user_email": user_data.email,  # Use email for custom auth
                "title": "Algebra - Level 1: The Language of Division",
                "subject": "Mathematics",
                "class_level": "Class 7",
                "topic": "Algebra - The Language of Division",
                "saved_at": datetime.now().isoformat(),
                "transcript": {
                    "sections": transcript_data.get("sections", []),
                    "transcript": [
                        {
                            "section": entry.get("section", ""),
                            "text": entry.get("text", ""),
                            "timestamp": entry.get("timestamp", "")
                        }
                        for entry in transcript_data.get("transcript", [])
                    ]
                },
                "qa_interactions": [
                    {
                        "section": qa.get("section", ""),
                        "text": qa.get("text", ""),
                        "timestamp": qa.get("timestamp", ""),
                        "type": qa.get("type", "qa")
                    }
                    for qa in qa_data.get("data", {}).get("qa_transcript", [])
                ],
                "sections": lecture_streamer.sections,
                "total_sections": len(lecture_streamer.sections),
                "diagram_info": enhanced_diagram_info,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Save to database using authenticated client
            try:
                print("Saving lecture data:", lecture_data)  # Debug log
                
                # Use service role key to bypass RLS for authenticated operations
                from config import supabase, SERVICE_ROLE_KEY, SUPABASE_URL
                from supabase import create_client, Client
                
                # Create service role client (bypasses RLS)
                auth_supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
                
                result = auth_supabase.table("saved_lectures").insert(lecture_data).execute()
                print("Save result:", result)  # Debug log
                
                # If save is successful, add to transcript
                lecture_streamer.add_to_transcript(
                    "save_option",
                    "Lecture saved successfully for revision."
                )
                
                return {
                    "status": "success",
                    "message": "Lecture saved successfully",
                    "data": {
                        "lecture_id": result.data[0]["id"] if result.data else None,
                        "saved_at": lecture_data["saved_at"]
                    }
                }
                
            except Exception as db_error:
                print(f"Database error: {db_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save lecture: {str(db_error)}"
                )
                
        except Exception as e:
            print(f"Error saving lecture: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error saving lecture: {str(e)}"
            )

    @router.delete("/saved-lecture/{lecture_id}")
    async def delete_saved_lecture(lecture_id: str, token_data: TokenData = Depends(get_current_user_token), credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
        """Delete a saved lecture by ID"""
        try:
            print(f"🗑️  Attempting to delete lecture: {lecture_id}")
            print(f"👤 User email: {token_data.email}")
            
            # Use service role key to bypass RLS for authenticated operations
            from config import supabase, SERVICE_ROLE_KEY, SUPABASE_URL
            from supabase import create_client, Client
            
            # Create service role client (bypasses RLS)
            auth_supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
            
            # Check if lecture exists and belongs to user
            print(f"🔍 Checking if lecture exists for user: {token_data.email}")
            lecture = auth_supabase.table("saved_lectures").select("*").eq("id", lecture_id).eq("user_email", token_data.email).execute()
            
            if not lecture.data:
                print(f"❌ Lecture not found or access denied for user: {token_data.email}")
                raise HTTPException(status_code=404, detail="Lecture not found or access denied")
            
            print(f"✅ Lecture found, proceeding with deletion")
            # Delete the lecture
            result = auth_supabase.table("saved_lectures").delete().eq("id", lecture_id).eq("user_email", token_data.email).execute()
            
            print(f"✅ Lecture deleted successfully")
            return {
                "status": "success",
                "message": "Lecture deleted successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error deleting lecture: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error deleting lecture: {str(e)}")

    # NEW: Interactive Diagram Endpoints
    @router.get("/interactive-diagram/analyze")
    async def analyze_diagram_for_labels():
        """Analyze the current diagram and extract clickable labels"""
        try:
            if not lecture_streamer:
                raise HTTPException(status_code=404, detail="Lecture streamer not available")
            
            # Get the current diagram image
            image_path = os.path.join(lecture_streamer.images_folder, "algebra_1.png")
            
            if not os.path.exists(image_path):
                raise HTTPException(status_code=404, detail="Diagram image not found")
            
            # Analyze the diagram using AI to identify labels
            labels = await analyze_diagram_labels(image_path)
            
            return {
                "status": "success",
                "data": {
                    "labels": labels,
                    "image_filename": "algebra_1.png",
                    "total_labels": len(labels)
                }
            }
            
        except Exception as e:
            print(f"Error analyzing diagram: {e}")
            raise HTTPException(status_code=500, detail=f"Error analyzing diagram: {str(e)}")

    @router.post("/interactive-diagram/explain-label")
    async def explain_diagram_label(request: dict):
        """Explain a specific label when clicked"""
        try:
            label = request.get("label")
            if not label:
                raise HTTPException(status_code=400, detail="Label is required")
            
            # Generate explanation for the label
            explanation = await generate_label_explanation(label)
            
            # Synthesize speech for the explanation
            if lecture_streamer and lecture_streamer.tts:
                try:
                    # For interactive diagram, we need to ensure audio works immediately
                    # even when lecture is paused
                    
                    # Ensure audio stream is open for interactive diagram
                    if not lecture_streamer.stream or not lecture_streamer.stream.is_active():
                        print("Reopening audio stream for interactive diagram")
                        lecture_streamer.open_audio_stream()
                    
                    # Ensure audio thread is running
                    if not lecture_streamer.audio_thread_running:
                        print("Starting audio thread for interactive diagram")
                        lecture_streamer.start_audio_thread()
                    
                    # Clean text for TTS
                    clean_explanation = lecture_streamer.clean_text_for_tts(explanation)
                    print(f"TTS: Synthesizing explanation for '{label}': {clean_explanation[:50]}...")
                    
                    # For interactive diagram, we need to bypass the pause check
                    # and directly synthesize the audio
                    if lecture_streamer.interactive_diagram_active:
                        print("Interactive diagram active - synthesizing audio immediately")
                        # Direct synthesis for interactive diagram
                        lecture_streamer.synthesize_and_stream_text(clean_explanation)
                    else:
                        # Normal synthesis for regular lecture
                        lecture_streamer.synthesize_and_stream_text(clean_explanation)
                    
                    # Add to interactive diagram transcript only (not main lecture transcript)
                    # This keeps transcript inside the interactive diagram overlay
                    if hasattr(lecture_streamer, 'interactive_transcript'):
                        lecture_streamer.interactive_transcript.append({
                            "label": label,
                            "explanation": explanation,
                            "timestamp": datetime.now().isoformat()
                        })
                    else:
                        # Initialize interactive transcript if it doesn't exist
                        lecture_streamer.interactive_transcript = [{
                            "label": label,
                            "explanation": explanation,
                            "timestamp": datetime.now().isoformat()
                        }]
                    
                    print(f"TTS: Successfully synthesized explanation for '{label}'")
                    
                except Exception as tts_error:
                    print(f"TTS error for interactive diagram: {tts_error}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"TTS not available for interactive diagram. TTS: {lecture_streamer.tts if lecture_streamer else 'No streamer'}")
            
            return {
                "status": "success",
                "data": {
                    "label": label,
                    "explanation": explanation,
                    "audio_generated": lecture_streamer.tts is not None
                }
            }
            
        except Exception as e:
            print(f"Error explaining label: {e}")
            raise HTTPException(status_code=500, detail=f"Error explaining label: {str(e)}")

    @router.get("/interactive-diagram/status")
    async def get_interactive_diagram_status():
        """Get the current status of interactive diagram"""
        try:
            if not lecture_streamer:
                return {
                    "status": "success",
                    "data": {
                        "is_active": False,
                        "current_label": None,
                        "labels": [],
                        "image_filename": None
                    }
                }
            
            return {
                "status": "success",
                "data": {
                    "is_active": getattr(lecture_streamer, 'interactive_diagram_active', False),
                    "current_label": getattr(lecture_streamer, 'current_label', None),
                    "labels": getattr(lecture_streamer, 'diagram_labels', []),
                    "image_filename": "image1.png"
                }
            }
            
        except Exception as e:
            print(f"Error getting interactive diagram status: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

    @router.post("/interactive-diagram/activate")
    async def activate_interactive_diagram():
        """Activate the interactive diagram mode"""
        try:
            if not lecture_streamer:
                raise HTTPException(status_code=404, detail="Lecture streamer not available")
            
            # Clear the audio queue for immediate interactive diagram TTS
            print("Clearing audio queue for interactive diagram")
            lecture_streamer.clear_audio_queue()
            
            # Ensure audio system is ready for interactive diagram TTS
            print("Ensuring audio system is ready for interactive diagram")
            if not lecture_streamer.stream or not lecture_streamer.stream.is_active():
                print("Opening audio stream for interactive diagram")
                lecture_streamer.open_audio_stream()
            
            if not lecture_streamer.audio_thread_running:
                print("Starting audio thread for interactive diagram")
                lecture_streamer.start_audio_thread()
            
            # Set interactive diagram as active
            lecture_streamer.interactive_diagram_active = True
            
            # Initialize interactive transcript for this session
            lecture_streamer.interactive_transcript = []
            
            # Analyze diagram for labels
            image_path = os.path.join(lecture_streamer.images_folder, "algebra_1.png")
            labels = await analyze_diagram_labels(image_path)
            
            # Store labels in lecture streamer
            lecture_streamer.diagram_labels = labels
            
            # Don't add transcript entry - keep it silent for cleaner UX
            # The frontend will handle the user notification
            
            return {
                "status": "success",
                "data": {
                    "is_active": True,
                    "labels": labels,
                    "image_filename": "algebra_1.png",
                    "message": f"Interactive diagram activated with {len(labels)} labels - Queue cleared for immediate TTS"
                }
            }
            
        except Exception as e:
            print(f"Error activating interactive diagram: {e}")
            raise HTTPException(status_code=500, detail=f"Error activating diagram: {str(e)}")

    @router.get("/interactive-diagram/transcript")
    async def get_interactive_diagram_transcript():
        """Get the interactive diagram transcript"""
        try:
            if not lecture_streamer:
                return {
                    "status": "success",
                    "data": {
                        "transcript": []
                    }
                }
            
            interactive_transcript = getattr(lecture_streamer, 'interactive_transcript', [])
            
            return {
                "status": "success",
                "data": {
                    "transcript": interactive_transcript
                }
            }
            
        except Exception as e:
            print(f"Error getting interactive diagram transcript: {e}")
            raise HTTPException(status_code=500, detail=f"Error getting transcript: {str(e)}")

    @router.post("/interactive-diagram/deactivate")
    async def deactivate_interactive_diagram():
        """Deactivate the interactive diagram mode"""
        try:
            if not lecture_streamer:
                raise HTTPException(status_code=404, detail="Lecture streamer not available")
            
            # Clear any remaining TTS in the queue to ensure clean transition
            # This prevents leftover audio from interactive diagram from interfering with lecture TTS
            lecture_streamer.clear_audio_queue()
            
            # Stop any ongoing TTS synthesis for interactive diagram
            print("Stopping any ongoing TTS synthesis for interactive diagram")
            
            # Small delay to ensure clean transition
            import time
            time.sleep(0.5)
            
            # Set interactive diagram as inactive
            lecture_streamer.interactive_diagram_active = False
            lecture_streamer.current_label = None
            
            # Clear interactive transcript to leave no traces
            if hasattr(lecture_streamer, 'interactive_transcript'):
                lecture_streamer.interactive_transcript = []
            
            # Don't add transcript entry - just deactivate silently
            # The lecture continues naturally from where it left off
            
            return {
                "status": "success",
                "data": {
                    "is_active": False,
                    "message": "Interactive diagram deactivated - Lecture continues with clean TTS"
                }
            }
            
        except Exception as e:
            print(f"Error deactivating interactive diagram: {e}")
            raise HTTPException(status_code=500, detail=f"Error deactivating diagram: {str(e)}")

    # Helper functions for interactive diagram
    async def analyze_diagram_labels(image_path: str) -> List[Dict[str, Any]]:
        """Analyze diagram image and extract clickable labels using AI"""
        try:
            # Read and encode the image
            with open(image_path, "rb") as image_file:
                import base64
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Create AI prompt for algebra diagram analysis
            analysis_prompt = f"""
            Analyze this algebra diagram image and identify the key mathematical elements that should be labeled for educational purposes.
            
            Please identify:
            1. Mathematical expressions and equations
            2. Variables, constants, and terms
            3. Mathematical symbols and operations (+, -, ×, ÷, =, etc.)
            4. Visual representations of mathematical concepts
            5. Any other important mathematical elements visible in the diagram
            
            For each identified element, provide:
            - A clear, educational name
            - A brief description of what it represents mathematically
            - Suggested position coordinates (x, y as percentages)
            - A unique color code for visual distinction
            
            Return the analysis as a JSON array of objects with this structure:
            [
                {{
                    "id": "unique_identifier",
                    "name": "Element Name",
                    "description": "Brief description",
                    "position": {{"x": percentage, "y": percentage}},
                    "color": "#hexcolor"
                }}
            ]
            
            Focus on making this educational and student-friendly. Include 4-8 key elements that would help a student understand wave properties.
            """
            
            # Use Gemini AI to analyze the diagram
            if lecture_streamer and lecture_streamer.gemini_api_key:
                try:
                    # Prepare the request for Gemini
                    gemini_request = {
                        "contents": [
                            {
                                "parts": [
                                    {
                                        "text": analysis_prompt
                                    },
                                    {
                                        "inline_data": {
                                            "mime_type": "image/png",
                                            "data": image_data
                                        }
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.3,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 2048,
                        }
                    }
                    
                    # Make request to Gemini
                    response = requests.post(
                        lecture_streamer.gemini_url,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": lecture_streamer.gemini_api_key
                        },
                        json=gemini_request,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if "candidates" in result and len(result["candidates"]) > 0:
                            content = result["candidates"][0]["content"]["parts"][0]["text"]
                            
                            # Extract JSON from the response
                            import re
                            json_match = re.search(r'\[.*\]', content, re.DOTALL)
                            if json_match:
                                import json
                                labels = json.loads(json_match.group())
                                
                                # Validate and clean the labels
                                cleaned_labels = []
                                colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#A8E6CF", "#FF8B94"]
                                
                                for i, label in enumerate(labels):
                                    if isinstance(label, dict) and "name" in label:
                                        cleaned_label = {
                                            "id": label.get("id", f"label_{i}"),
                                            "name": label["name"],
                                            "description": label.get("description", f"Description of {label['name']}"),
                                            "position": label.get("position", {"x": 20 + (i * 15), "y": 20 + (i * 10)}),
                                            "color": label.get("color", colors[i % len(colors)])
                                        }
                                        cleaned_labels.append(cleaned_label)
                                
                                print(f"AI analyzed diagram and found {len(cleaned_labels)} labels")
                                return cleaned_labels
                    
                    print("Failed to get AI analysis, using fallback")
                    
                except Exception as ai_error:
                    print(f"AI analysis error: {ai_error}")
            
            # Fallback to predefined labels if AI fails
            print("Using fallback labels for wave diagram")
            fallback_labels = [
                {
                    "id": "wavelength",
                    "name": "Wavelength",
                    "description": "Distance between consecutive wave peaks",
                    "position": {"x": 30, "y": 50},
                    "color": "#FF6B6B"
                },
                {
                    "id": "amplitude", 
                    "name": "Amplitude",
                    "description": "Maximum displacement from equilibrium",
                    "position": {"x": 70, "y": 30},
                    "color": "#4ECDC4"
                },
                {
                    "id": "crest",
                    "name": "Crest",
                    "description": "Highest point of the wave",
                    "position": {"x": 50, "y": 20},
                    "color": "#45B7D1"
                },
                {
                    "id": "trough",
                    "name": "Trough", 
                    "description": "Lowest point of the wave",
                    "position": {"x": 50, "y": 80},
                    "color": "#96CEB4"
                }
            ]
            
            return fallback_labels
            
        except Exception as e:
            print(f"Error analyzing diagram labels: {e}")
            return []

    async def generate_label_explanation(label: str) -> str:
        """Generate a friendly explanation for a diagram label using AI"""
        try:
            # Create AI prompt for explanation
            explanation_prompt = f"""
            You are a friendly and enthusiastic physics teacher explaining wave concepts to a 7th-grade student.
            
            Please provide a clear, engaging, and educational explanation for the wave property: "{label}"
            
            Your explanation should:
            1. Be friendly and conversational (like talking to a friend)
            2. Use simple, relatable examples (like ocean waves, sound, light)
            3. Explain what this property means in simple terms
            4. Mention how it's measured or observed
            5. Connect it to everyday applications
            6. Be about 2-3 sentences long
            
            Make it fun and memorable! Use analogies that a 7th grader would understand.
            """
            
            # Use Gemini AI to generate explanation
            if lecture_streamer and lecture_streamer.gemini_api_key:
                try:
                    # Prepare the request for Gemini
                    gemini_request = {
                        "contents": [
                            {
                                "parts": [
                                    {
                                        "text": explanation_prompt
                                    }
                                ]
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.7,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 500,
                        }
                    }
                    
                    # Make request to Gemini
                    response = requests.post(
                        lecture_streamer.gemini_url,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": lecture_streamer.gemini_api_key
                        },
                        json=gemini_request,
                        timeout=15
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if "candidates" in result and len(result["candidates"]) > 0:
                            explanation = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                            print(f"AI generated explanation for '{label}': {explanation[:100]}...")
                            return explanation
                    
                    print("Failed to get AI explanation, using fallback")
                    
                except Exception as ai_error:
                    print(f"AI explanation error: {ai_error}")
            
            # Fallback explanations if AI fails
            fallback_explanations = {
                "wavelength": "The wavelength is the distance between two consecutive wave peaks or troughs. Think of it like the length of one complete wave cycle - it's how far you have to travel along the wave before it starts repeating! Wavelength is measured in meters and determines the color of light waves or the pitch of sound waves.",
                
                "amplitude": "The amplitude is the maximum displacement of the wave from its equilibrium position. It tells us how 'tall' or 'strong' the wave is - like how high ocean waves get or how loud a sound is. Amplitude determines the brightness of light waves or the loudness of sound waves.",
                
                "crest": "The crest is the highest point of the wave - the peak where the wave reaches its maximum positive displacement. In our diagram, you can see these as the top points of the wave. When you're at the beach, the crests are the highest points of the ocean waves that surfers love to ride!",
                
                "trough": "The trough is the lowest point of the wave - the valley where the wave reaches its maximum negative displacement. In our diagram, you can see these as the bottom points of the wave. Think of it like the lowest point between two ocean waves.",
                
                "equilibrium": "The equilibrium line is the baseline or rest position of the wave - it's where the wave would be if there was no disturbance. In our diagram, this is the horizontal line that runs through the middle of the wave. It represents the normal, undisturbed state of the medium.",
                
                "frequency": "The frequency is the number of complete wave cycles that pass a point in one second. It's measured in Hertz (Hz). Higher frequency means more waves per second, which results in shorter wavelengths. For sound waves, higher frequency means higher pitch. For light waves, higher frequency means different colors!"
            }
            
            return fallback_explanations.get(label.lower(), f"The {label} is an important property of waves that helps us understand how waves behave and interact with the world around us.")
            
        except Exception as e:
            print(f"Error generating label explanation: {e}")
            return f"The {label} is an important wave property that helps us understand wave behavior."

except ImportError as e:
    print(f"⚠️  FastAPI dependencies not available: {e}")
    print("📝 Running in standalone mode only")
    print("💡 To run as web server, install: pip install fastapi uvicorn")
    
    # Don't run standalone lecture automatically
    print("🚀 Physics Lecture API with Revision Tools Ready!")
    print("💡 The lecture will only start when you click 'Start Lecture' in the frontend!")
    print("🎓 After lecture completion, use revision tools to generate summary & flashcards!")

if __name__ == "__main__":
    # Don't run anything automatically - wait for API calls
    pass 