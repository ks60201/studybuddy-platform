"""
🎭 EMOTION-AWARE Q&A SYSTEM - WORLD'S FIRST PERSONALIZED AI TEACHER
This revolutionary system detects student emotions from question patterns and adapts responses.

Emotion Ranges:
- CURIOUS: Student is engaged, wants to explore deeper
- SIMPLE: Student needs basic clarification
- NERVOUS: Student is confused or anxious, needs reassurance
"""

import re

class EmotionDetector:
    """Detects student emotion from question patterns and provides response guidelines"""
    
    def __init__(self):
        print("🎭 Emotion Detector initialized for Algebra Level 1!")
        
        # 🔍 CURIOUS RANGE - Student is exploring and engaged
        self.curious_keywords = [
            "why", "how does", "how do", "what if", "can you explain",
            "i want to know", "i'm curious", "tell me more",
            "what happens when", "is it possible", "could you show",
            "interesting", "fascinating", "cool", "amazing", "awesome",
            "deeper", "more about", "behind", "reason", "wonder",
            "what's the connection", "how is this related", "explore",
            "discover", "learn more", "understand better", "dive into",
            "investigate", "analyze", "examine", "study", "research",
            "brilliant", "incredible", "mind-blowing", "eye-opening",
            "enlightening", "revealing", "insightful", "profound",
            "breakthrough", "aha moment", "eureka", "got it",
            "makes sense", "clicked", "understood", "comprehended"
        ]
        
        self.curious_patterns = [
            r"why (?:does|is|do|can|would|will)",
            r"how (?:does|do|can|is|would|will|come)",
            r"what if (?:we|i|you|they|it)",
            r"can you (?:explain|show|tell|demonstrate|illustrate)",
            r"(?:more|deeper|further) (?:about|into|explanation|details)",
            r"(?:connection|relationship|link) (?:between|to|with)",
            r"(?:i|we) (?:wonder|want to know|curious about)",
            r"(?:tell|show) me (?:more|about|how|why)",
            r"(?:what|how) (?:makes|makes this|happens when)",
            r"(?:is it|can it|does it) (?:possible|true|real)",
            r"(?:i|this) (?:love|enjoy|find) (?:learning|exploring|discovering)",
            r"(?:aha|eureka|got it|makes sense|clicked)",
            r"(?:brilliant|amazing|incredible|fascinating|awesome)"
        ]
        
        # 😊 SIMPLE RANGE - Student needs basic clarification
        self.simple_keywords = [
            "what is", "what are", "what does", "define",
            "meaning", "means", "example", "like what",
            "can you give", "show me", "quick question",
            "just want to know", "simply", "basic", "basically",
            "again", "repeat", "one more time", "once more",
            "in simple words", "easy way", "understand", "clear",
            "straightforward", "plain", "simple terms", "basic idea",
            "main point", "key concept", "core idea", "essence",
            "summary", "overview", "brief", "short", "quick",
            "just", "only", "merely", "simply put", "in short",
            "to sum up", "basically", "essentially", "fundamentally"
        ]
        
        self.simple_patterns = [
            r"what (?:is|are|does|do|was|were)",
            r"(?:define|definition of|defines)",
            r"(?:meaning|means) (?:of|that|this)",
            r"(?:example|examples) (?:of|for|with)",
            r"in simple (?:words|terms|language)",
            r"(?:easy|easier|simplest) (?:way|explanation|method)",
            r"(?:just|only|merely) (?:want|need|asking)",
            r"(?:quick|brief|short) (?:question|explanation|answer)",
            r"(?:can you|could you) (?:give|show|tell|explain)",
            r"(?:one more|once more|again) (?:time|please)",
            r"(?:main|key|core|basic) (?:point|idea|concept)",
            r"(?:in short|basically|essentially|simply put)",
            r"(?:to sum up|in summary|overview)"
        ]
        
        # 😰 NERVOUS RANGE - Student is confused or anxious
        self.nervous_keywords = [
            "confused", "don't understand", "not getting", "don't get",
            "lost", "difficult", "hard", "stuck", "blocked",
            "help", "struggling", "can't figure", "cannot figure",
            "not sure", "unsure", "unclear", "vague", "fuzzy",
            "worried", "frustrated", "complicated", "complex",
            "makes no sense", "don't get it", "doesn't make sense",
            "too hard", "too difficult", "too complex", "overwhelming",
            "impossible", "can't do", "cannot do", "stuck on",
            "trouble", "problem", "issue", "challenge", "struggle",
            "anxious", "nervous", "scared", "afraid", "worried",
            "panic", "overwhelmed", "lost", "clueless", "blank",
            "mind blank", "drawing blank", "no idea", "clueless",
            "give up", "quit", "impossible", "hopeless", "desperate"
        ]
        
        self.nervous_patterns = [
            r"(?:don't|do not|can't|cannot|won't|will not) (?:understand|get|see|figure|solve)",
            r"(?:i'm|i am|im) (?:confused|lost|stuck|blocked|overwhelmed)",
            r"(?:this is|it's|its) (?:difficult|hard|confusing|complicated|impossible)",
            r"(?:not|no) (?:understanding|getting|seeing|comprehending)",
            r"(?:help|struggling|trouble) (?:with|to|understanding|figuring)",
            r"(?:too|very|really|extremely) (?:hard|difficult|complex|complicated)",
            r"(?:makes|doesn't make|does not make) (?:no|any) sense",
            r"(?:i|we) (?:can't|cannot|unable to) (?:do|figure|solve|understand)",
            r"(?:stuck|blocked|lost) (?:on|with|at)",
            r"(?:mind|brain) (?:blank|goes blank|drawing blank)",
            r"(?:no|zero|absolutely no) (?:idea|clue|understanding)",
            r"(?:give up|quit|impossible|hopeless|desperate)",
            r"(?:anxious|nervous|scared|afraid|worried|panic)"
        ]
    
    def detect_emotion(self, question):
        """
        Detect the emotional state of the student from their question
        
        Args:
            question (str): The student's question
            
        Returns:
            dict: {
                "emotion": "curious" | "simple" | "nervous",
                "confidence": float (0-1),
                "keywords_found": list of matched keywords,
                "suggestion": str (response style suggestion)
            }
        """
        question_lower = question.lower().strip()
        
        # Score each emotion range
        curious_score = 0
        simple_score = 0
        nervous_score = 0
        
        matched_keywords = {
            "curious": [],
            "simple": [],
            "nervous": []
        }
        
        # Check keywords
        for keyword in self.curious_keywords:
            if keyword in question_lower:
                curious_score += 1
                matched_keywords["curious"].append(keyword)
        
        for keyword in self.simple_keywords:
            if keyword in question_lower:
                simple_score += 1
                matched_keywords["simple"].append(keyword)
        
        for keyword in self.nervous_keywords:
            if keyword in question_lower:
                nervous_score += 2  # Higher weight for nervous indicators
                matched_keywords["nervous"].append(keyword)
        
        # Check patterns (worth 2 points each)
        for pattern in self.curious_patterns:
            if re.search(pattern, question_lower):
                curious_score += 2
                matched_keywords["curious"].append(f"pattern: {pattern}")
        
        for pattern in self.simple_patterns:
            if re.search(pattern, question_lower):
                simple_score += 2
                matched_keywords["simple"].append(f"pattern: {pattern}")
        
        for pattern in self.nervous_patterns:
            if re.search(pattern, question_lower):
                nervous_score += 3  # Higher weight for nervous patterns
                matched_keywords["nervous"].append(f"pattern: {pattern}")
        
        # Enhanced punctuation analysis
        question_marks = question.count("?")
        exclamation_marks = question.count("!")
        
        if question_marks > 2:
            nervous_score += 2  # Multiple question marks = high confusion
        elif question_marks > 1:
            nervous_score += 1  # Multiple question marks = confusion
        
        if exclamation_marks > 1:
            curious_score += 2  # Multiple exclamation marks = high excitement
        elif exclamation_marks > 0:
            curious_score += 1  # Exclamation marks = excitement
        
        # Enhanced length analysis
        word_count = len(question_lower.split())
        if word_count > 30:
            nervous_score += 2  # Very long questions = high confusion
        elif word_count > 15:
            nervous_score += 1  # Long questions = confusion
        elif word_count < 3:
            simple_score += 2  # Very short questions = simple clarification
        elif word_count < 6:
            simple_score += 1  # Short questions = simple clarification
        
        # Capitalization analysis
        if question.isupper():
            nervous_score += 2  # ALL CAPS = frustration/panic
        elif any(word.isupper() for word in question.split() if len(word) > 1):
            nervous_score += 1  # Mixed caps = emphasis/frustration
        
        # Typing patterns (repeated characters)
        if re.search(r'(.)\1{2,}', question_lower):
            nervous_score += 1  # Repeated characters = frustration
        
        # Question structure analysis
        if question_lower.startswith(('why', 'how', 'what if')):
            curious_score += 1  # Exploratory questions
        elif question_lower.startswith(('what is', 'what are', 'define')):
            simple_score += 1  # Definition questions
        elif question_lower.startswith(('help', 'i don\'t', 'i can\'t')):
            nervous_score += 2  # Help-seeking questions
        
        # Determine dominant emotion
        total_score = curious_score + simple_score + nervous_score
        
        if total_score == 0:
            # Default to simple if no clear indicators
            emotion = "simple"
            confidence = 0.5
        else:
            scores = {
                "curious": curious_score,
                "simple": simple_score,
                "nervous": nervous_score
            }
            emotion = max(scores, key=scores.get)
            confidence = scores[emotion] / total_score
        
        # Get response style suggestion
        suggestion = self.get_response_style(emotion)
        
        result = {
            "emotion": emotion,
            "confidence": confidence,
            "keywords_found": matched_keywords[emotion],
            "suggestion": suggestion,
            "all_scores": {
                "curious": curious_score,
                "simple": simple_score,
                "nervous": nervous_score
            }
        }
        
        print(f"🎭 Emotion detected: {emotion.upper()} (confidence: {confidence:.2f})")
        print(f"   Keywords matched: {matched_keywords[emotion][:3]}")
        
        return result
    
    def get_response_style(self, emotion):
        """Get the appropriate response style for the detected emotion"""
        
        if emotion == "curious":
            return """
📚 CURIOUS STUDENT RESPONSE STYLE - DEEP EXPLORATION MODE:
🚨 OPENING: Start with "Excellent question! You're thinking like a real mathematician!"
🚨 TONE: Enthusiastic and exploratory (use exclamation marks!)
🚨 DEPTH: Go beyond the basics - explain the "why" and "how"
🚨 USE: "fascinating", "interesting", "here's what's cool", "you'll love this", "brilliant", "incredible"

Required elements:
- Validate their curiosity: "This shows you're really thinking deeply!"
- Explain the underlying WHY: "The reason this works is..."
- Connect to bigger concepts: "This relates to..." or "In advanced math..."
- Give multiple perspectives: "Another way to think about it..."
- Include a bonus insight: "Here's something even more interesting..."
- Show real applications: "Scientists use this to..." or "Engineers apply this when..."
- Encourage further exploration: "You could even explore..." or "Try experimenting with..."
- Use mathematical symbols: x/5, 20/x + 2, 3x = 15 (NEVER word descriptions)
- End with: "Keep asking these deep questions - that's how breakthroughs happen!"
- Length: 200-250 words with depth and enthusiasm
- Include phrases like: "mind-blowing", "eye-opening", "breakthrough moment"
"""
        
        elif emotion == "simple":
            return """
😊 SIMPLE CLARIFICATION RESPONSE STYLE - QUICK & CLEAR:
🚨 OPENING: Start with "Good question! Let me explain this clearly."
🚨 TONE: Friendly, direct, and straightforward (no overwhelming details)
🚨 KEEP IT SIMPLE: Focus only on what they asked
🚨 USE: "simply put", "basically", "in other words", "here's how", "essentially"

Required elements:
- Give the direct answer first: "Simply put, x/5 means..."
- Use ONE clear example: "For example, if x = 10..."
- Break into 2-3 numbered steps if needed
- Use everyday analogies: "Think of it like sharing pizza..."
- Avoid technical jargon and complex explanations
- Use mathematical symbols: x/5, 20/x + 2, 3x = 15 (NEVER word descriptions)
- Check understanding: "Does that make sense?" or "Clear?"
- Offer more help: "Want another example?" or "Need clarification?"
- Length: 100-150 words, concise and clear
- Keep it focused and avoid tangents
"""
        
        elif emotion == "nervous":
            return """
💚 NERVOUS/CONFUSED STUDENT RESPONSE STYLE - CRITICAL REQUIREMENTS:
🚨 MANDATORY OPENING: Start with "Don't worry at all! This is actually easier than it looks, I promise!"
🚨 TONE: CALM, PATIENT, REASSURING (use gentle, supportive language)
🚨 PACE: Slow and methodical - break everything into tiny steps
🚨 USE: "no worries", "totally normal", "you've got this", "step by step"
🚨 TONE: Be CALM, PATIENT, and REASSURING (NOT overly excited)
🚨 NO CAPS LOCK except for reassurance like "You're doing GREAT!"
🚨 AVOID: Words like "incredible", "amazing", "mind-blowing", "super cool" - these can overwhelm
🚨 USE INSTEAD: "simple", "easy", "straightforward", "clear", "no problem"

Required elements:
- Acknowledge their confusion: "I understand this feels confusing right now"
- Reassure them: "You're doing GREAT by asking - that's how learning works!"
- Break into 2-3 TINY steps with numbers: "First...", "Then...", "Finally..."
- Use ONE simple example (not multiple)
- Use mathematical symbols: x/5, 20/x + 2, 3x = 15 (NEVER word descriptions)
- Pause for understanding: "See? That's all there is to it!"
- Normalize struggle: "This is totally normal to find tricky at first"
- Build confidence: "You already understand the hard part!"
- Offer support: "Want to try one more together? I'm here to help!"
- Use calming phrases: "no pressure", "take your time", "we'll go slow"
- Length: 150-180 words, calm and supportive tone
- End with encouragement: "You're becoming an algebra expert already!"
"""
        
        return "Provide a clear, helpful answer appropriate for Class 7 students."
    
    def generate_emotion_prompt(self, question, current_topic, emotion_data):
        """
        Generate a Gemini prompt that incorporates emotion awareness
        
        Args:
            question (str): The student's question
            current_topic (str): The current algebra topic
            emotion_data (dict): The emotion detection result
            
        Returns:
            str: Complete prompt for Gemini with emotion context
        """
        emotion = emotion_data["emotion"]
        confidence = emotion_data["confidence"]
        suggestion = emotion_data["suggestion"]
        
        base_prompt = f"""
🎭 EMOTION-AWARE RESPONSE SYSTEM - PERSONALIZED AI TEACHING

⚠️ CRITICAL: This student is {emotion.upper()} (confidence: {confidence:.2f})
You MUST follow the {emotion.upper()} response style guidelines below EXACTLY.

CURRENT TOPIC: {current_topic}
STUDENT'S QUESTION: "{question}"

{suggestion}

🚨 MANDATORY REQUIREMENTS:
1. Use mathematical symbols (x/5, 20/x + 2, x = 7) - the Math Wall handles speech conversion
2. Be appropriate for Class 7 students (12-13 years old)
3. STRICTLY follow the {emotion.upper()} tone and style above
4. Do NOT mix response styles - stay true to the {emotion.upper()} guidelines
5. Make the student feel understood and supported

⚠️ REMINDER: The student is {emotion.upper()} - tailor your response accordingly!

YOUR RESPONSE (following {emotion.upper()} style):
"""
        
        return base_prompt


# 🧪 TEST FUNCTION
if __name__ == "__main__":
    print("🧪 Testing Emotion Detector for Algebra Level 1")
    print("=" * 60)
    
    detector = EmotionDetector()
    
    # Test questions
    test_questions = [
        "Why does x/5 mean x divided by 5?",  # CURIOUS
        "What is a variable?",  # SIMPLE
        "I'm confused about inverse operations, I don't understand",  # NERVOUS
        "How does the fraction bar work with multiple terms?",  # CURIOUS
        "Can you give me an example of substitution?",  # SIMPLE
        "This is too hard, I'm lost and don't get it at all",  # NERVOUS
        "What if we have two variables in one equation?",  # CURIOUS
        "What does constant mean?",  # SIMPLE
        "Help! I can't figure out how to solve this, it makes no sense"  # NERVOUS
    ]
    
    print("\n🎭 Testing Emotion Detection:\n")
    for i, question in enumerate(test_questions, 1):
        print(f"\n{'='*60}")
        print(f"Question {i}: {question}")
        print('-'*60)
        result = detector.detect_emotion(question)
        print(f"\n✅ Detected: {result['emotion'].upper()}")
        print(f"   Confidence: {result['confidence']:.2%}")
        print(f"   Scores: {result['all_scores']}")
        print(f"   Keywords: {result['keywords_found'][:3]}")
    
    print("\n" + "="*60)
    print("✅ Emotion Detector test completed!")

