from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from enum import Enum
import requests
import base64
import json
import asyncio
import hashlib
import time
import random
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import aiohttp
from functools import lru_cache
import logging
import jwt
from auth import get_current_user_token, TokenData, get_current_user_data
from config import supabase, SECRET_KEY, ALGORITHM

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-doubt-solver", tags=["AI Doubt Solver"])

# Add security dependency
async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return email
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Configuration
GEMINI_API_KEY = "AIzaSyCBI-2UyqWJg6mMpG10NB_QfUVKgknNS5g"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
RATE_LIMIT_PER_MINUTE = 60
CACHE_DURATION_MINUTES = 30

# Enums for better type safety
class SubjectType(str, Enum):
    MATH = "math"
    SCIENCE = "science"
    ENGLISH = "english"
    HISTORY = "history"
    GEOGRAPHY = "geography"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    COMPUTER_SCIENCE = "computer_science"
    GENERAL = "general"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"

class ResponseStyle(str, Enum):
    CONVERSATIONAL = "conversational"
    FORMAL = "formal"
    STORY_BASED = "story_based"
    ANALOGY_RICH = "analogy_rich"
    INTERACTIVE = "interactive"

# Enhanced Models
class GeminiAnswer(BaseModel):
    answer: str = Field(..., description="The AI-generated answer")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in the answer")
    response_time: float = Field(..., description="Time taken to generate response")
    suggested_followups: List[str] = Field(default_factory=list, description="Suggested follow-up questions")
    learning_resources: List[str] = Field(default_factory=list, description="Additional learning resources")
    difficulty_assessment: DifficultyLevel = Field(..., description="Assessed difficulty of the question")
    key_concepts: List[str] = Field(default_factory=list, description="Key concepts covered")
    visual_aids_suggested: bool = Field(default=False, description="Whether visual aids would help")

class QuestionAnalysis(BaseModel):
    subject: SubjectType
    difficulty: DifficultyLevel
    keywords: List[str]
    requires_calculation: bool
    requires_diagram: bool
    estimated_time_minutes: int

# Advanced caching system
class ResponseCache:
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.access_times: Dict[str, datetime] = {}
    
    def _generate_key(self, question: str, class_level: int, subject: str) -> str:
        content = f"{question}_{class_level}_{subject}".lower()
        return hashlib.md5(content.encode()).hexdigest()
    
    def get(self, question: str, class_level: int, subject: str) -> Optional[Dict[str, Any]]:
        key = self._generate_key(question, class_level, subject)
        if key in self.cache:
            if datetime.now() - self.access_times[key] < timedelta(minutes=CACHE_DURATION_MINUTES):
                return self.cache[key]
            else:
                del self.cache[key]
                del self.access_times[key]
        return None
    
    def set(self, question: str, class_level: int, subject: str, response: Dict[str, Any]):
        key = self._generate_key(question, class_level, subject)
        self.cache[key] = response
        self.access_times[key] = datetime.now()

cache = ResponseCache()

# Rate limiting
class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        now = datetime.now()
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Clean old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if now - req_time < timedelta(minutes=1)
        ]
        
        if len(self.requests[client_id]) >= RATE_LIMIT_PER_MINUTE:
            return False
        
        self.requests[client_id].append(now)
        return True

rate_limiter = RateLimiter()

# Enhanced prompt generation with multiple strategies
class PromptGenerator:
    def __init__(self):
        self.style_templates = {
            ResponseStyle.CONVERSATIONAL: self._conversational_template,
            ResponseStyle.FORMAL: self._formal_template,
            ResponseStyle.STORY_BASED: self._story_template,
            ResponseStyle.ANALOGY_RICH: self._analogy_template,
            ResponseStyle.INTERACTIVE: self._interactive_template
        }
        
        self.subject_specific_prompts = {
            SubjectType.MATH: self._math_specific_prompt,
            SubjectType.SCIENCE: self._science_specific_prompt,
            SubjectType.ENGLISH: self._english_specific_prompt,
            SubjectType.HISTORY: self._history_specific_prompt,
        }

        self.grade_level_adjustments = {
            # Lower grades (1-5)
            "lower": """
            **GRADE LEVEL ADJUSTMENTS:**
            - Use simple, concrete examples from daily life
            - Break down concepts into very small steps
            - Use more visual descriptions and analogies
            - Avoid complex terminology
            - Focus on foundational understanding
            - Use encouraging, friendly language
            - Include interactive elements when possible
            """,
            
            # Middle grades (6-8)
            "middle": """
            **GRADE LEVEL ADJUSTMENTS:**
            - Balance concrete and abstract concepts
            - Use age-appropriate real-world examples
            - Introduce subject-specific terminology gradually
            - Encourage critical thinking
            - Make connections to other subjects
            - Use engaging, relatable scenarios
            - Include some mathematical/scientific reasoning
            """,
            
            # Higher grades (9-12)
            "higher": """
            **GRADE LEVEL ADJUSTMENTS:**
            - Focus on abstract concepts and deeper understanding
            - Use more sophisticated examples and analogies
            - Include proper terminology and technical language
            - Encourage analytical and critical thinking
            - Make connections to advanced concepts
            - Discuss real-world applications
            - Include mathematical/scientific proofs when relevant
            """
        }
    
    def _get_grade_category(self, grade: int) -> str:
        if grade <= 5:
            return "lower"
        elif grade <= 8:
            return "middle"
        else:
            return "higher"
    
    def generate_prompt(self, question: str, class_level: int, subject: SubjectType, 
                       style: ResponseStyle, difficulty: DifficultyLevel) -> str:
        # Get base prompt
        base_prompt = self.style_templates[style](class_level, question, subject.value)
        
        # Add grade-level adjustments
        grade_category = self._get_grade_category(class_level)
        base_prompt += self.grade_level_adjustments[grade_category]
        
        # Add subject-specific enhancements
        if subject in self.subject_specific_prompts:
            base_prompt = self.subject_specific_prompts[subject](base_prompt)
        
        # Add difficulty-specific instructions
        difficulty_prompts = {
            DifficultyLevel.EASY: f"\n**DIFFICULTY LEVEL:** Keep it simple and build confidence. Target grade {class_level} level with occasional grade {min(class_level + 1, 12)} concepts.",
            DifficultyLevel.MEDIUM: f"\n**DIFFICULTY LEVEL:** Balance between grades {class_level} and {min(class_level + 1, 12)} concepts. Provide good explanations.",
            DifficultyLevel.HARD: f"\n**DIFFICULTY LEVEL:** Challenge with grade {min(class_level + 1, 12)} concepts while maintaining grade {class_level} foundation.",
            DifficultyLevel.EXPERT: f"\n**DIFFICULTY LEVEL:** Include advanced grade {min(class_level + 2, 12)} concepts while connecting to grade {class_level} knowledge."
        }
        
        base_prompt += difficulty_prompts[difficulty]
        
        # Add grade-specific reminder
        base_prompt += f"""

**GRADE LEVEL REMINDER:**
- Primary audience is grade {class_level} student
- Core concepts should be at grade {class_level} level
- Can introduce concepts up to grade {min(class_level + 2, 12)} if student shows understanding
- Always connect new concepts back to grade {class_level} foundation
- Check understanding before advancing difficulty
"""
        
        return base_prompt
    
    def _conversational_template(self, class_level: int, question: str, subject: str) -> str:
        return f"""
🎯 **YOUR BRILLIANT STUDY BUDDY** 🎯

You are an expert tutor who gives the BEST, most helpful answers in the world!

**STUDENT'S QUESTION:** {question}
**SUBJECT:** {subject}
**GRADE:** {class_level}

**YOUR MISSION:**
- Give the MOST helpful and to-the-point answer possible
- Be super friendly and encouraging
- Use simple, clear language that's perfect for grade {class_level}
- Include ONE perfect example that makes it crystal clear
- Use emojis to make it fun and engaging
- Highlight key points in **bold**
- Keep it concise but comprehensive (2-3 paragraphs max)

**RESPONSE STRUCTURE:**
1. **Direct Answer** - Give the clearest, most helpful answer immediately
2. **Perfect Example** - One example that makes it click
3. **Key Takeaway** - One sentence summary of the most important point
4. **Encouragement** - Make them feel smart and capable

Remember: You're giving the BEST answer in the world! Focus ONLY on the answer. Do NOT include follow-up questions in your response. 🌟
"""
    
    def _story_template(self, class_level: int, question: str, subject: str) -> str:
        return f"""
📚 **QUICK STORY TIME!** 📚

Make this concept fun with a short, engaging story!

**QUESTION:** {question}
**SUBJECT:** {subject}
**GRADE:** {class_level}

**YOUR STYLE:**
- Keep the story short (2-3 paragraphs max)
- Use everyday situations
- Make it relatable and fun
- Include one "aha!" moment
- End with a quick summary

Remember: Think short bedtime story, not a novel! 🌟
"""
    
    def _analogy_template(self, class_level: int, question: str, subject: str) -> str:
        return f"""
🔗 **SIMPLE COMPARISON BUDDY** 🔗

Explain this using one clear, relatable comparison!

**QUESTION:** {question}
**SUBJECT:** {subject}
**GRADE:** {class_level}

**YOUR STYLE:**
- Use ONE clear analogy
- Keep it super simple
- Relate to daily life
- Explain in 2-3 paragraphs max
- Add a quick summary

Remember: One perfect comparison is better than many! 🎯
"""
    
    def _interactive_template(self, class_level: int, question: str, subject: str) -> str:
        return f"""
🎮 **FUN LEARNING BUDDY** 🎮

Make this interactive and fun!

**QUESTION:** {question}
**SUBJECT:** {subject}
**GRADE:** {class_level}

**YOUR STYLE:**
- Start with a quick explanation
- Add ONE mini-activity
- Keep it under 3 paragraphs
- Use emojis and fun language
- End with encouragement

Remember: Quick, fun, and hands-on! 🌟
"""
    
    def _formal_template(self, class_level: int, question: str, subject: str) -> str:
        return f"""
🎓 **YOUR PERSONAL ACADEMIC TUTOR** 🎓

You are a dedicated academic tutor providing comprehensive, structured learning support tailored specifically for this Grade {class_level} student.

**STUDENT'S INQUIRY:** {question}
**SUBJECT FOCUS:** {subject}
**STUDENT'S ACADEMIC LEVEL:** Grade {class_level}

**YOUR PERSONALIZED TUTORING APPROACH:**
Provide thorough, well-structured explanations that build this student's deep understanding and academic confidence.

**YOUR STRUCTURED TUTORING METHOD:**
📋 **Personal Introduction:** "Let me help you understand exactly what we'll explore together..."
📚 **Foundation Building:** "Here's what you need to know first..."
🔍 **Detailed Exploration:** "Now let's dive deeper into this concept..."
📊 **Real Examples:** "Here are some examples that will make this clear for you..."
📝 **Personal Summary:** "Let me help you organize the key points you've learned..."
🎯 **Self-Check Questions:** "Here are some questions to test your understanding..."

**YOUR ACADEMIC COMMITMENT TO THEM:**
- Use precise terminology while explaining it clearly for their level
- Build ideas logically so they can follow your reasoning
- Provide evidence and proof they can understand
- Connect to other subjects they're studying
- Offer advanced challenges if they're ready for more

**KEEP IT PERSONAL AND SUPPORTIVE:**
- Address them directly as "you" throughout
- Acknowledge their curiosity and intelligence
- Help them feel confident about tackling academic material
- Encourage questions and deeper thinking
- Make them feel capable of mastering complex ideas

Provide the highest quality academic support while making this student feel confident and capable! 🌟
"""
    
    def _math_specific_prompt(self, base_prompt: str) -> str:
        return base_prompt + """

**MATHEMATICAL EXCELLENCE ADDITIONS:**
🧮 **Step-by-Step Solutions:** Show every calculation step
📐 **Visual Representations:** Suggest diagrams, graphs, or visual aids
🔢 **Multiple Methods:** Show different ways to solve when possible
🎯 **Common Mistakes:** Highlight what to avoid
🔍 **Check Your Work:** Include verification methods
💡 **Real-World Applications:** Connect to practical uses
🎪 **Mathematical Beauty:** Show the elegance and patterns

**MATHEMATICAL FORMATTING:**
- Use proper mathematical notation
- Include unit conversions when relevant
- Show worked examples
- Use tables or charts for data
"""
    
    def _science_specific_prompt(self, base_prompt: str) -> str:
        return base_prompt + """

**SCIENTIFIC EXCELLENCE ADDITIONS:**
🔬 **Scientific Method:** Connect to observation, hypothesis, testing
🧪 **Hands-On Activities:** Suggest safe experiments or demos
🌍 **Real-World Connections:** Link to current events or nature
📊 **Data and Evidence:** Include relevant facts and figures
🔍 **Scientific Vocabulary:** Use and explain key terms
🎯 **Misconceptions:** Address common misunderstandings
🚀 **Future Applications:** Show where this leads

**SCIENTIFIC FORMATTING:**
- Include relevant scientific notation
- Use diagrams and process flows
- Show cause-and-effect relationships
- Include safety considerations for activities
"""
    
    def _english_specific_prompt(self, base_prompt: str) -> str:
        return base_prompt + """

**LANGUAGE ARTS EXCELLENCE ADDITIONS:**
📖 **Literary Devices:** Identify and explain techniques used
🎭 **Context and Culture:** Provide historical/cultural background
💭 **Critical Thinking:** Encourage analysis and interpretation
✍️ **Writing Connections:** Show how this applies to their writing
🗣️ **Speaking Skills:** Include pronunciation and presentation tips
🎨 **Creative Expression:** Encourage personal responses
📚 **Reading Strategies:** Provide comprehension techniques

**LANGUAGE FORMATTING:**
- Use proper grammar and sentence structure
- Include vocabulary definitions
- Show examples from literature
- Provide writing prompts or exercises
"""
    
    def _history_specific_prompt(self, base_prompt: str) -> str:
        return base_prompt + """

**HISTORICAL EXCELLENCE ADDITIONS:**
🕐 **Timeline Context:** Place events in chronological order
🗺️ **Geographic Connections:** Show where events occurred
👥 **Multiple Perspectives:** Include different viewpoints
🔗 **Cause and Effect:** Show how events connected
📜 **Primary Sources:** Reference historical documents when possible
🌍 **Modern Relevance:** Connect to current events
🎭 **Historical Empathy:** Help understand people's motivations

**HISTORICAL FORMATTING:**
- Use chronological organization
- Include maps or geographic references
- Show different historical interpretations
- Connect to broader historical themes
"""

prompt_generator = PromptGenerator()

# Question analysis system
class QuestionAnalyzer:
    def __init__(self):
        self.subject_keywords = {
            SubjectType.MATH: ["calculate", "solve", "equation", "formula", "number", "algebra", "geometry"],
            SubjectType.SCIENCE: ["experiment", "hypothesis", "theory", "reaction", "evolution", "physics"],
            SubjectType.ENGLISH: ["analyze", "essay", "literature", "grammar", "writing", "poem", "story"],
            SubjectType.HISTORY: ["when", "historical", "war", "civilization", "ancient", "revolution"],
            SubjectType.GEOGRAPHY: ["where", "location", "climate", "country", "continent", "mountain"],
        }
        
        # Grade-specific keywords and concepts
        self.grade_level_indicators = {
            # Lower grades (1-5)
            "lower": {
                "keywords": ["basic", "simple", "easy", "understand", "learn", "practice"],
                "math": ["add", "subtract", "multiply", "divide", "fraction", "decimal"],
                "science": ["plant", "animal", "weather", "body", "earth", "space"],
                "english": ["read", "write", "spell", "grammar", "story", "vocabulary"]
            },
            # Middle grades (6-8)
            "middle": {
                "keywords": ["explain", "describe", "compare", "analyze", "understand"],
                "math": ["algebra", "geometry", "ratio", "percent", "equation"],
                "science": ["cell", "force", "energy", "chemical", "reaction"],
                "english": ["essay", "paragraph", "theme", "character", "plot"]
            },
            # Higher grades (9-12)
            "higher": {
                "keywords": ["analyze", "evaluate", "synthesize", "prove", "derive"],
                "math": ["function", "calculus", "trigonometry", "probability"],
                "science": ["physics", "chemistry", "biology", "theory", "hypothesis"],
                "english": ["thesis", "analysis", "research", "literature", "critique"]
            }
        }
        
        self.difficulty_indicators = {
            DifficultyLevel.EASY: ["what is", "define", "simple", "basic", "easy"],
            DifficultyLevel.MEDIUM: ["how", "why", "compare", "explain", "analyze"],
            DifficultyLevel.HARD: ["evaluate", "synthesize", "complex", "advanced", "critical"],
            DifficultyLevel.EXPERT: ["expert", "research", "thesis", "theoretical", "sophisticated"]
        }
    
    def _get_grade_category(self, grade: int) -> str:
        if grade <= 5:
            return "lower"
        elif grade <= 8:
            return "middle"
        else:
            return "higher"
    
    def analyze_question(self, question: str, class_level: int) -> QuestionAnalysis:
        question_lower = question.lower()
        grade_category = self._get_grade_category(class_level)
        
        # Determine subject with grade-level context
        subject_scores = {}
        for subject, keywords in self.subject_keywords.items():
            # Base score from general keywords
            score = sum(1 for keyword in keywords if keyword in question_lower)
            
            # Add score from grade-specific keywords
            if subject.value in self.grade_level_indicators[grade_category]:
                grade_specific_keywords = self.grade_level_indicators[grade_category][subject.value]
                score += sum(2 for keyword in grade_specific_keywords if keyword in question_lower)
            
            subject_scores[subject] = score
        
        subject = max(subject_scores, key=subject_scores.get) if max(subject_scores.values()) > 0 else SubjectType.GENERAL
        
        # Determine difficulty based on grade level and indicators
        difficulty_scores = {}
        for difficulty, indicators in self.difficulty_indicators.items():
            score = sum(1 for indicator in indicators if indicator in question_lower)
            
            # Adjust difficulty based on grade-specific keywords
            grade_keywords = self.grade_level_indicators[grade_category]["keywords"]
            if any(keyword in question_lower for keyword in grade_keywords):
                if difficulty == DifficultyLevel.EASY:
                    score += 2
                elif difficulty == DifficultyLevel.MEDIUM:
                    score += 1
            
            difficulty_scores[difficulty] = score
        
        # Default to medium difficulty if no clear indicators
        difficulty = max(difficulty_scores, key=difficulty_scores.get) if max(difficulty_scores.values()) > 0 else DifficultyLevel.MEDIUM
        
        # Extract keywords with grade-level context
        keywords = []
        # Add subject-specific keywords
        if subject.value in self.grade_level_indicators[grade_category]:
            grade_keywords = self.grade_level_indicators[grade_category][subject.value]
            keywords.extend([word for word in grade_keywords if word in question_lower])
        # Add general keywords from the question
        question_keywords = [word for word in question_lower.split() if len(word) > 3]
        keywords.extend(question_keywords)
        keywords = list(set(keywords))[:5]  # Get unique keywords, max 5
        
        # Check for calculation needs
        requires_calculation = any(word in question_lower for word in ["calculate", "solve", "compute", "find", "="])
        
        # Check for diagram needs
        requires_diagram = any(word in question_lower for word in ["draw", "diagram", "graph", "chart", "show"])
        
        # Estimate time based on grade level and complexity
        base_time = min(max(len(question.split()) // 10, 2), 15)
        if grade_category == "higher":
            base_time = min(base_time * 1.5, 20)  # More time for higher grades
        elif grade_category == "lower":
            base_time = max(base_time * 0.7, 2)  # Less time for lower grades
        
        return QuestionAnalysis(
            subject=subject,
            difficulty=difficulty,
            keywords=keywords,
            requires_calculation=requires_calculation,
            requires_diagram=requires_diagram,
            estimated_time_minutes=int(base_time)
        )

analyzer = QuestionAnalyzer()

# Enhanced API client with better error handling
class GeminiClient:
    def __init__(self):
        self.session = None
        self.ssl_context = self._create_ssl_context()
    
    def _create_ssl_context(self):
        import ssl
        import certifi
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        return ssl_context
    
    async def __aenter__(self):
        connector = aiohttp.TCPConnector(ssl=self.ssl_context)
        self.session = aiohttp.ClientSession(connector=connector)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def generate_response(self, prompt: str, image_data: Optional[str] = None, 
                              mime_type: Optional[str] = None) -> Dict[str, Any]:
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        
        if image_data:
            contents[0]["parts"].append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_data
                }
            })
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                }
            ]
        }
        
        params = {"key": GEMINI_API_KEY}
        
        try:
            async with self.session.post(GEMINI_URL, params=params, json=payload, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    if "candidates" in data and len(data["candidates"]) > 0:
                        return data
                    else:
                        logger.error("No candidates in Gemini response")
                        raise HTTPException(
                            status_code=500,
                            detail="AI model did not generate a response. Please try again."
                        )
                else:
                    error_text = await response.text()
                    logger.error(f"Gemini API error: {response.status} - {error_text}")
                    if response.status == 429:
                        raise HTTPException(
                            status_code=429,
                            detail="Too many requests. Please try again in a moment."
                        )
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"AI service error: {error_text}"
                    )
        except aiohttp.ClientError as e:
            logger.error(f"Network error: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="Network error. Please check your connection and try again."
            )
        except asyncio.TimeoutError:
            logger.error("Request timeout")
            raise HTTPException(
                status_code=504,
                detail="Request timed out. Please try again."
            )
        except Exception as e:
            logger.error(f"Unexpected error in generate_response: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="An unexpected error occurred. Please try again."
            )

# Response enhancement system
class ResponseEnhancer:
    def __init__(self):
        # Grade-specific follow-up templates
        self.grade_followups = {
            "lower": {  # Grades 1-5
                SubjectType.MATH: [
                    "Would you like to try an easier problem?",
                    "Let's practice with different numbers!",
                    "Can you think of a fun way to use this math in your daily life?"
                ],
                SubjectType.SCIENCE: [
                    "Want to try a simple experiment about this?",
                    "What other examples can you think of?",
                    "How does this happen in nature?"
                ],
                "default": [
                    "What else would you like to learn about this?",
                    "Should we try something similar?",
                    "How can you use this in your daily life?"
                ]
            },
            "middle": {  # Grades 6-8
                SubjectType.MATH: [
                    "Want to explore a similar but slightly harder problem?",
                    "How would this change with different variables?",
                    "Can you connect this to other math topics you've learned?"
                ],
                SubjectType.SCIENCE: [
                    "What experiment could we design to test this?",
                    "How does this connect to other scientific concepts?",
                    "What real-world applications can you think of?"
                ],
                "default": [
                    "How does this connect to other topics you're studying?",
                    "What questions do you still have?",
                    "Want to explore this topic further?"
                ]
            },
            "higher": {  # Grades 9-12
                SubjectType.MATH: [
                    "Want to explore the advanced applications of this concept?",
                    "How would you prove this mathematically?",
                    "Can you derive this formula from first principles?"
                ],
                SubjectType.SCIENCE: [
                    "How could we design an experiment to verify this?",
                    "What are the theoretical implications?",
                    "How does this relate to current research?"
                ],
                "default": [
                    "How could you apply this to solve real-world problems?",
                    "What deeper questions does this raise?",
                    "Want to explore the advanced aspects of this topic?"
                ]
            }
        }

        # Grade-specific learning resources
        self.grade_resources = {
            "lower": {
                "math": [
                    "Practice with interactive math games",
                    "Draw pictures to help understand",
                    "Use physical objects to count and calculate"
                ],
                "science": [
                    "Watch educational science videos",
                    "Try simple home experiments",
                    "Make a picture book about this topic"
                ],
                "default": [
                    "Create a colorful mind map",
                    "Make flashcards with pictures",
                    "Practice with fun online games"
                ]
            },
            "middle": {
                "math": [
                    "Solve practice problems in your textbook",
                    "Watch video tutorials on this topic",
                    "Create your own practice problems"
                ],
                "science": [
                    "Do hands-on experiments",
                    "Create a science journal",
                    "Research online simulations"
                ],
                "default": [
                    "Make detailed notes",
                    "Find online practice quizzes",
                    "Create study guides"
                ]
            },
            "higher": {
                "math": [
                    "Work through advanced problem sets",
                    "Study theoretical foundations",
                    "Explore online math courses"
                ],
                "science": [
                    "Read scientific papers",
                    "Design your own experiments",
                    "Study advanced textbooks"
                ],
                "default": [
                    "Research academic sources",
                    "Create detailed study materials",
                    "Explore online courses"
                ]
            }
        }
    
    def _get_grade_category(self, grade: int) -> str:
        if grade <= 5:
            return "lower"
        elif grade <= 8:
            return "middle"
        else:
            return "higher"
    
    async def enhance_response(self, raw_answer: str, analysis: QuestionAnalysis, 
                        response_time: float, class_level: int, original_question: str) -> GeminiAnswer:
        # Calculate confidence score based on response quality and grade appropriateness
        confidence = self._calculate_confidence(raw_answer, analysis, class_level)
        
        # Get grade-appropriate follow-ups and resources
        grade_category = self._get_grade_category(class_level)
        followups = await self._generate_followups(analysis, grade_category, original_question, raw_answer)
        resources = self._suggest_resources(analysis, grade_category)
        
        # Extract key concepts
        key_concepts = self._extract_key_concepts(raw_answer, analysis)
        
        # Check if visual aids would help
        visual_aids = analysis.requires_diagram or "diagram" in raw_answer.lower()
        
        return GeminiAnswer(
            answer=raw_answer,
            confidence_score=confidence,
            response_time=response_time,
            suggested_followups=followups,
            learning_resources=resources,
            difficulty_assessment=analysis.difficulty,
            key_concepts=key_concepts,
            visual_aids_suggested=visual_aids
        )
    
    def _calculate_confidence(self, answer: str, analysis: QuestionAnalysis, class_level: int) -> float:
        base_confidence = 0.8
        
        # Adjust based on answer length and structure
        if len(answer) < 100:
            base_confidence -= 0.1
        elif len(answer) > 500:
            base_confidence += 0.1
        
        # Adjust based on formatting and structure
        if "**" in answer or "*" in answer:
            base_confidence += 0.05
        
        if any(phrase in answer.lower() for phrase in ["for example", "let's", "imagine"]):
            base_confidence += 0.05
        
        # Adjust based on grade-appropriate language
        grade_category = self._get_grade_category(class_level)
        grade_keywords = {
            "lower": ["simple", "basic", "easy", "fun", "let's try"],
            "middle": ["understand", "explain", "compare", "think about"],
            "higher": ["analyze", "evaluate", "consider", "theoretical"]
        }
        
        keyword_matches = sum(1 for keyword in grade_keywords[grade_category] 
                            if keyword in answer.lower())
        base_confidence += (keyword_matches * 0.02)
        
        return min(max(base_confidence, 0.0), 1.0)
    
    async def _generate_followups(self, analysis: QuestionAnalysis, grade_category: str, original_question: str, answer: str) -> List[str]:
        """Generate AI-powered follow-up questions based on the original question and answer."""
        
        # Create a prompt for generating follow-up questions
        followup_prompt = f"""
You are the BEST tutor in the world! 🌟 You just helped a {grade_category} student understand something amazing.

STUDENT'S QUESTION: "{original_question}"
YOUR BRILLIANT ANSWER: "{answer}"

Now generate 4 INCREDIBLE follow-up questions that will make the student's mind EXPLODE with curiosity! 🚀

CRITICAL REQUIREMENTS:
- Questions MUST be SPECIFIC to the exact topic just explained
- Reference specific details from your answer
- Make them SUPER engaging and exciting
- Use emojis and friendly language
- Focus on practical applications and deeper thinking
- Each question should be COMPLETELY DIFFERENT and AMAZING
- Make the student want to learn more immediately!

EXAMPLES of what NOT to do:
❌ "How could you apply this to solve real-world problems?" (too generic)
❌ "What deeper questions does this raise?" (too vague)
❌ "Want to explore the advanced aspects of this topic?" (boring)

EXAMPLES of what TO do:
✅ "💡 What would happen if we doubled the wavelength in this wave experiment?"
✅ "🔬 Can you design a simple experiment to test this concept at home?"
✅ "🌍 How does this wave behavior explain why sound travels differently underwater?"
✅ "⚡ What if we changed the medium from water to air - how would the wave change?"

Generate exactly 4 AMAZING, SPECIFIC follow-up questions now (each starting with "💡 "):
"""

        followup_questions = []  # Initialize the variable
        
        try:
            # Temporarily disable AI generation to test if this is causing the 500 error
            logger.info("AI follow-up generation temporarily disabled for testing")
            raise Exception("AI generation temporarily disabled for testing")
            
            # Use a simpler approach to avoid async context issues
            # async with aiohttp.ClientSession() as session:
            #     async with session.post(
            #         GEMINI_URL,
            #         params={"key": GEMINI_API_KEY},
            #         json={
            #             "contents": [{"role": "user", "parts": [{"text": followup_prompt}]}],
            #             "generationConfig": {
            #                 "temperature": 0.7,
            #                 "topK": 40,
            #                 "topP": 0.95,
            #                 "maxOutputTokens": 1024,
            #             }
            #         },
            #         timeout=aiohttp.ClientTimeout(total=30)
            #     ) as response:
            #         if response.status == 200:
            #             data = await response.json()
            #             if "candidates" in data and len(data["candidates"]) > 0:
            #                 followup_text = data["candidates"][0]["content"]["parts"][0]["text"]
            #                 print(f"AI Generated Follow-up Text: {followup_text}")  # Debug
            #                 
            #                 # Split by lines and extract questions starting with 💡
            #                 lines = followup_text.strip().split('\n')
            #                 for line in lines:
            #                     line = line.strip()
            #                     # Look for lines starting with 💡 or other emojis
            #                     if line.startswith('💡 ') or line.startswith('🔬 ') or line.startswith('🌍 ') or line.startswith('⚡ '):
            #                         # Extract the question part
            #                         question = line.replace('💡 ', '').replace('🔬 ', '').replace('🌍 ', '').replace('⚡ ', '').strip()
            #                         if question and len(question) > 15:  # Ensure it's a meaningful question
            #                         # Add back the 💡 emoji for consistency
            #                         followup_questions.append(f"💡 {question}")
            #                 
            #                 # If we got good AI-generated questions, return them
            #                 if len(followup_questions) >= 2:
            #                     return followup_questions[:4]  # Return up to 4 questions
                    
        except Exception as e:
            logger.error(f"Error generating AI follow-ups: {e}")
            logger.error(f"Follow-up error type: {type(e)}")
            import traceback
            logger.error(f"Follow-up traceback: {traceback.format_exc()}")
        
        # If we didn't get enough good questions, try a simpler approach
        if len(followup_questions) < 2:
            logger.info("Not enough good AI questions, using fallback")
            # Generate simple but specific questions based on the topic
            topic_keywords = analysis.keywords[:3] if analysis.keywords else ["this concept"]
            fallback_questions = [
                f"💡 What would happen if we changed the {topic_keywords[0]} in this experiment?",
                f"🔬 Can you design a simple test to verify this {topic_keywords[0]} concept?",
                f"🌍 How does this {topic_keywords[0]} apply to something you see every day?",
                f"⚡ What if we doubled the {topic_keywords[0]} - how would that change the result?"
            ]
            return fallback_questions[:4]
        
        # Fallback to predefined questions if AI generation fails
        base_followups = self.grade_followups[grade_category].get(
            analysis.subject,
            self.grade_followups[grade_category]["default"]
        )
        
        # Add subject-specific follow-ups with BEST questions
        subject_specific = {
            SubjectType.MATH: [
                "🌟 Can you solve this same problem but with different numbers? (Try changing the values!)",
                "🧮 What would happen if we doubled/halved one of the variables?",
                "🔗 How does this connect to other math topics you've learned this year?",
                "💡 Can you create your own problem using this exact same method?",
                "🎯 What's the most important thing to remember when solving this type of problem?",
                "⚡ What's the fastest way to check if your answer is correct?"
            ],
            SubjectType.SCIENCE: [
                "🔬 What simple experiment could you do at home to test this concept?",
                "🌍 How does this apply to something you see every day?",
                "⚡ What would happen if we changed the temperature/pressure/conditions?",
                "💡 Can you think of 3 other examples of this phenomenon in nature?",
                "🎯 What's the most surprising thing about this scientific concept?",
                "🔍 What questions would you ask to understand this even better?"
            ],
            SubjectType.ENGLISH: [
                "✍️ Can you write a short story using this concept as the main idea?",
                "🗣️ How would you explain this to a 5-year-old child?",
                "📚 What other books have you read that use this same concept?",
                "💡 Can you create your own example that's completely different?",
                "🎯 What's the most important thing to remember about this concept?",
                "🔍 What makes this concept different from similar ones you've learned?"
            ],
            SubjectType.HISTORY: [
                "🌍 How does this historical event connect to what's happening in the world today?",
                "⚡ What would have happened if this event went completely differently?",
                "👥 How did this event change the lives of ordinary people at the time?",
                "🔗 Can you find 3 similarities with other historical events you've studied?",
                "🎯 What's the most important lesson we can learn from this event?",
                "💡 What questions would you ask someone who lived during this time?"
            ],
            SubjectType.PHYSICS: [
                "⚡ What experiment could you do to prove this physics concept?",
                "🌍 How does this apply to sports, cars, or machines you use every day?",
                "💡 What would happen if we changed the speed/mass/energy in this situation?",
                "🎯 What's the most amazing thing about this physics concept?",
                "🔍 Can you think of 3 real-world examples of this phenomenon?",
                "⚙️ How does this connect to other physics concepts you've learned?"
            ],
            SubjectType.CHEMISTRY: [
                "🧪 What simple chemical reaction could you do to demonstrate this concept?",
                "🌍 How does this chemical process happen in your body or in nature?",
                "⚡ What would happen if we changed the temperature/concentration?",
                "💡 What's the most surprising thing about this chemical concept?",
                "🔍 Can you think of 3 everyday examples of this chemical process?",
                "🎯 What's the most important safety rule when working with this concept?"
            ],
            SubjectType.BIOLOGY: [
                "🔬 What experiment could you do to observe this biological process?",
                "🌍 How does this happen in your own body or in nature around you?",
                "💡 What would happen if we changed the environment/conditions?",
                "🎯 What's the most amazing thing about this biological concept?",
                "🔍 Can you think of 3 examples of this in plants, animals, or humans?",
                "⚡ How does this help living things survive and grow?"
            ]
        }
        
        # Combine base follow-ups with subject-specific ones
        all_followups = base_followups + subject_specific.get(analysis.subject, [])
        
        # Return 4 BEST follow-ups (more variety and quality)
        return random.sample(all_followups, min(4, len(all_followups)))
    

    
    def _suggest_resources(self, analysis: QuestionAnalysis, grade_category: str) -> List[str]:
        subject_key = analysis.subject.value if analysis.subject.value in self.grade_resources[grade_category] else "default"
        base_resources = self.grade_resources[grade_category][subject_key]
        
        # Add more specific and actionable resources
        specific_resources = {
            SubjectType.MATH: [
                "Try solving 5 practice problems on this topic",
                "Create flashcards with formulas and examples",
                "Use online math games to practice this concept",
                "Draw diagrams to visualize the problem"
            ],
            SubjectType.SCIENCE: [
                "Conduct a simple experiment at home",
                "Watch educational videos on this topic",
                "Create a science journal entry about this concept",
                "Find real-world examples in your daily life"
            ],
            SubjectType.ENGLISH: [
                "Write a short story using this concept",
                "Practice reading comprehension with related texts",
                "Create vocabulary flashcards",
                "Record yourself explaining this to someone else"
            ],
            SubjectType.HISTORY: [
                "Create a timeline of related events",
                "Research how this connects to current events",
                "Write a diary entry from someone who lived during this time",
                "Make a map showing where these events happened"
            ]
        }
        
        # Combine base resources with subject-specific ones
        all_resources = base_resources + specific_resources.get(analysis.subject, [])
        
        # Add calculation/diagram specific resources
        if analysis.requires_calculation:
            all_resources.append(f"Practice with {grade_category}-level problems step by step")
        
        if analysis.requires_diagram:
            all_resources.append("Draw diagrams to visualize the concept clearly")
        
        # Return top 3 most relevant resources
        return random.sample(all_resources, min(3, len(all_resources)))
    
    def _extract_key_concepts(self, answer: str, analysis: QuestionAnalysis) -> List[str]:
        # Simple keyword extraction - in production, you'd use NLP
        concepts = []
        
        # Look for words in bold or emphasized
        import re
        bold_words = re.findall(r'\*\*(.*?)\*\*', answer)
        italic_words = re.findall(r'\*(.*?)\*', answer)
        
        concepts.extend(bold_words)
        concepts.extend(italic_words)
        
        # Add some keywords from the analysis
        concepts.extend(analysis.keywords[:3])
        
        return list(set(concepts))[:5]  # Return unique concepts, max 5

enhancer = ResponseEnhancer()

# Dependency for rate limiting
async def check_rate_limit(client_id: str = "default"):
    if not rate_limiter.is_allowed(client_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return client_id

class ConversationHistory:
    def __init__(self):
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}
        self.max_history = 5  # Keep last 5 exchanges

    def add_exchange(self, user_id: str, question: str, answer: str, subject: str):
        if user_id not in self.conversations:
            self.conversations[user_id] = []
        
        self.conversations[user_id].append({
            "question": question,
            "answer": answer,
            "subject": subject,
            "timestamp": datetime.utcnow()
        })
        
        # Keep only recent history
        if len(self.conversations[user_id]) > self.max_history:
            self.conversations[user_id] = self.conversations[user_id][-self.max_history:]

    def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        return self.conversations.get(user_id, [])

    def format_history_prompt(self, user_id: str) -> str:
        history = self.get_history(user_id)
        if not history:
            return ""
        
        prompt = "\n**PREVIOUS CONVERSATION:**\n"
        for exchange in history:
            prompt += f"Q: {exchange['question']}\n"
            prompt += f"A: {exchange['answer'][:200]}...\n"  # Include start of previous answers
        return prompt

conversation_history = ConversationHistory()

# Main endpoint with all enhancements
@router.post("/ask", response_model=GeminiAnswer)
async def ask_doubt(
    question: str = Form(..., min_length=3, max_length=1000),
    subject: SubjectType = Form(default=SubjectType.GENERAL),
    style: ResponseStyle = Form(default=ResponseStyle.CONVERSATIONAL),
    difficulty: Optional[DifficultyLevel] = Form(default=None),
    image: Optional[UploadFile] = File(None),
    token_data: TokenData = Depends(get_current_user_token)
):
    start_time = time.time()
    
    try:
        # Get user's grade from database using the correct method
        user_data = await get_current_user_data(token_data)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please log in again."
            )
        
        user_id = user_data.id
        user_grade = user_data.grade

        # Get conversation history
        history_prompt = conversation_history.format_history_prompt(user_id)
        
        # Analyze the question
        analysis = analyzer.analyze_question(question, user_grade)
        
        # Set difficulty
        if difficulty:
            analysis.difficulty = difficulty
        else:
            possible_grades = [user_grade]
            if user_grade < 12:
                possible_grades.append(user_grade + 1)
            if user_grade < 11:
                possible_grades.append(user_grade + 2)
            
            target_grade = random.choice(possible_grades)
            if target_grade == user_grade:
                analysis.difficulty = DifficultyLevel.MEDIUM
            elif target_grade == user_grade + 1:
                analysis.difficulty = DifficultyLevel.HARD
            else:
                analysis.difficulty = DifficultyLevel.EXPERT
        
        # Generate prompt
        base_prompt = prompt_generator.generate_prompt(
            question, user_grade, subject, style, analysis.difficulty
        )
        full_prompt = base_prompt + history_prompt
        
        # Handle image
        image_data = None
        mime_type = None
        if image:
            try:
                if image.size > 5 * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail="Image too large. Please use an image under 5MB."
                    )
                
                image_bytes = await image.read()
                image_data = base64.b64encode(image_bytes).decode()
                mime_type = image.content_type
            except Exception as e:
                logger.error(f"Image processing error: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to process image. Please try again."
                )
        
        # Get AI response
        try:
            async with GeminiClient() as client:
                response_data = await client.generate_response(full_prompt, image_data, mime_type)
            
            raw_answer = response_data["candidates"][0]["content"]["parts"][0]["text"]
            if not raw_answer.strip():
                raise ValueError("Empty response from AI")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI response error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to get AI response. Please try again."
            )
        
        response_time = time.time() - start_time
        
        # Enhance response
        try:
            logger.info(f"Starting response enhancement for question: {question[:50]}...")
            enhanced_answer = await enhancer.enhance_response(raw_answer, analysis, response_time, user_grade, question)
            logger.info("Response enhancement completed successfully")
            
            # Store in history
            conversation_history.add_exchange(
                user_id=user_id,
                question=question,
                answer=raw_answer,
                subject=subject.value
            )
            
            return enhanced_answer
            
        except Exception as e:
            logger.error(f"Response enhancement error: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process AI response: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in ask_doubt: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )

# Additional endpoints for enhanced functionality
@router.get("/subjects")
async def get_subjects():
    """Get all available subjects"""
    return {"subjects": [subject.value for subject in SubjectType]}

@router.get("/styles")
async def get_response_styles():
    """Get all available response styles"""
    return {"styles": [style.value for style in ResponseStyle]}

@router.post("/analyze")
async def analyze_question_endpoint(
    question: str = Form(...),
    class_level: int = Form(..., ge=1, le=13)
):
    """Analyze a question without generating a response"""
    analysis = analyzer.analyze_question(question, class_level)
    return analysis

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_size": len(cache.cache),
        "rate_limits_active": len(rate_limiter.requests)
    }

@router.post("/generate-followups")
async def generate_followups(
    question: str = Form(...),
    answer: str = Form(...),
    subject: SubjectType = Form(default=SubjectType.GENERAL),
    class_level: int = Form(..., ge=1, le=13),
    token_data: TokenData = Depends(get_current_user_token)
):
    """Generate AI-powered follow-up questions based on the original question and answer"""
    try:
        # Analyze the question
        analysis = analyzer.analyze_question(question, class_level)
        
        # Generate follow-up questions using AI
        grade_category = enhancer._get_grade_category(class_level)
        followups = await enhancer._generate_followups(analysis, grade_category, question, answer)
        
        return {
            "followups": followups,
            "subject": subject.value,
            "class_level": class_level
        }
        
    except Exception as e:
        logger.error(f"Error generating follow-ups: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate follow-up questions. Please try again."
        )

# Note: Exception handlers should be registered on the main FastAPI app, not on routers