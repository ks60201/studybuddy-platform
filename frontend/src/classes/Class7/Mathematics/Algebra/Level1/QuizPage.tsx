import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Brain,
  Target,
  Zap,
  Sparkles,
  Star,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Bookmark,
  Share2,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  Clock,
  BarChart3,
  Trophy,
  Award,
  TrendingUp,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw as ResetIcon,
  HelpCircle,
  MessageCircle,
  Send,
  Mic,
  MicOff,
} from "lucide-react";
import "./Level1.css";
import { API_BASE_URL } from "../../../../../config";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  option_labels: string[];
  correct_option: string; // 'A', 'B', 'C', 'D'
  explanations: Record<string, string>; // { A: string, B: string, ... }
  explain_correct: string;
}

interface QuizSet {
  title: string;
  class_level: string;
  subject: string;
  topic: string;
  total_questions: number;
  quiz: QuizQuestion[];
  generated_at: string;
}

const API_ENDPOINT = "/api/lectures/class7/mathematics/algebra/level1";

const QuizPage: React.FC = () => {
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // Enhanced states
  const [quizMode, setQuizMode] = useState<"practice" | "exam" | "review">(
    "practice"
  );
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStats, setQuizStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    totalAnswered: 0,
  });
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(
    new Map()
  );
  const [showResults, setShowResults] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState<Set<number>>(new Set());
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const API_ENDPOINT = "/api/lectures/class7/mathematics/algebra/level1";

  useEffect(() => {
    fetchQuiz();
    initializeVoiceRecognition();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeRemaining && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      setShowResults(true);
    }
  }, [timeRemaining]);

  const initializeVoiceRecognition = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        // Auto-select option based on voice input
        const current = quiz?.quiz[currentIndex];
        if (current) {
          const optionLabels = ["A", "B", "C", "D"];
          const spokenOption = optionLabels.find((label) =>
            transcript.toLowerCase().includes(label.toLowerCase())
          );
          if (spokenOption && !selectedOption) {
            handleOptionClick(spokenOption);
          }
        }
      };

      setRecognition(recognitionInstance);
      setIsVoiceSupported(true);
    }
  };

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/quiz?num_questions=10`
      );
      const data = await response.json();
      if (data.status === "success") {
        setQuiz(data.data);
        if (quizMode === "exam") {
          setTimeRemaining(30 * 60); // 30 minutes for exam mode
        }
      } else {
        setError(data.message || "Failed to load quiz");
      }
    } catch (err) {
      setError("Failed to connect to server for quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (label: string) => {
    if (!selectedOption) {
      setSelectedOption(label);
      setShowExplanation(true);
      setShowModal(true);

      // Update stats
      const current = quiz?.quiz[currentIndex];
      if (current) {
        const isCorrect = label === current.correct_option;
        setQuizStats((prev) => ({
          ...prev,
          correct: prev.correct + (isCorrect ? 1 : 0),
          incorrect: prev.incorrect + (isCorrect ? 0 : 1),
          totalAnswered: prev.totalAnswered + 1,
        }));

        // Store user answer
        setUserAnswers((prev) => new Map(prev.set(currentIndex, label)));
      }
    }
  };

  const startVoiceRecognition = () => {
    if (recognition && !isListening && !selectedOption) {
      recognition.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const nextQuestion = () => {
    if (currentIndex < (quiz?.quiz.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setShowHint(false);
    } else {
      setShowResults(true);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const previousAnswer = userAnswers.get(currentIndex - 1);
      setSelectedOption(previousAnswer || null);
      setShowExplanation(!!previousAnswer);
      setShowHint(false);
    }
  };

  const goBackToLecture = () => {
    window.location.href = "/ai-teacher/class7/mathematics/algebra/level1";
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setShowModal(false);
    setQuizStats({ correct: 0, incorrect: 0, skipped: 0, totalAnswered: 0 });
    setUserAnswers(new Map());
    setShowResults(false);
    setHintUsed(new Set());
    setShowHint(false);
    if (quizMode === "exam") {
      setTimeRemaining(30 * 60);
    }
  };

  const getScore = () => {
    if (quizStats.totalAnswered === 0) return 0;
    return Math.round((quizStats.correct / quizStats.totalAnswered) * 100);
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", color: "#10b981", icon: "🏆" };
    if (score >= 80) return { grade: "A", color: "#10b981", icon: "🥇" };
    if (score >= 70) return { grade: "B", color: "#f59e0b", icon: "🥈" };
    if (score >= 60) return { grade: "C", color: "#f59e0b", icon: "🥉" };
    return { grade: "D", color: "#ef4444", icon: "📚" };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="quiz-page-container">
        <div className="loading-screen">
          <motion.div
            className="loading-content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="loading-spinner-modern">
              <motion.div
                className="spinner-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="spinner-glow"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Preparing Your Quiz
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Generating intelligent questions with detailed explanations...
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !quiz || !quiz.quiz || quiz.quiz.length === 0) {
    return (
      <div className="quiz-page-container">
        <div className="error-screen">
          <motion.div
            className="error-content"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="error-icon"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📝
            </motion.div>
            <h2>No Quiz Available</h2>
            <p>{error || "We couldn't load your quiz. Please try again."}</p>
            <motion.button
              onClick={goBackToLecture}
              className="back-to-lecture-btn-modern"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={20} />
              Back to Lecture
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const current = quiz.quiz[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === current.correct_option;
  const score = getScore();
  const grade = getGrade(score);

  // Results Screen
  if (showResults) {
    return (
      <div className="quiz-page-container">
        <div className="results-screen">
          <motion.div
            className="results-content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="results-header"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="grade-display">
                <motion.div
                  className="grade-icon"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {grade.icon}
                </motion.div>
                <h1 className="grade-text" style={{ color: grade.color }}>
                  {grade.grade}
                </h1>
                <h2 className="score-text">{score}%</h2>
              </div>
              <h3>Quiz Complete!</h3>
              <p>
                Great job on completing the quiz. Here's your performance
                breakdown:
              </p>
            </motion.div>

            <motion.div
              className="results-stats"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="stat-card">
                <CheckCircle size={24} className="stat-icon correct" />
                <div className="stat-content">
                  <div className="stat-value">{quizStats.correct}</div>
                  <div className="stat-label">Correct</div>
                </div>
              </div>
              <div className="stat-card">
                <XCircle size={24} className="stat-icon incorrect" />
                <div className="stat-content">
                  <div className="stat-value">{quizStats.incorrect}</div>
                  <div className="stat-label">Incorrect</div>
                </div>
              </div>
              <div className="stat-card">
                <Clock size={24} className="stat-icon" />
                <div className="stat-content">
                  <div className="stat-value">{quizStats.skipped}</div>
                  <div className="stat-label">Skipped</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="results-actions"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.button
                onClick={resetQuiz}
                className="action-btn primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw size={20} />
                Retake Quiz
              </motion.button>
              <motion.button
                onClick={() =>
                  (window.location.href = `/ai-teacher/class7/mathematics/algebra/level1/flashcards`)
                }
                className="action-btn secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BookOpen size={20} />
                Study Flashcards
              </motion.button>
              <motion.button
                onClick={goBackToLecture}
                className="action-btn tertiary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={20} />
                Back to Lecture
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page-container">
      {/* Enhanced Header */}
      <motion.div
        className="quiz-header-modern"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content-modern">
          <div className="header-left-modern">
            <motion.div
              className="header-icon"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              📝
            </motion.div>
            <div className="header-text">
              <h1>{quiz.title}</h1>
              <p className="header-subtitle">
                {quiz.class_level} • {quiz.subject} • {quiz.topic}
              </p>
            </div>
          </div>

          <div className="header-stats-modern">
            <div className="stat-item-modern">
              <Target size={16} />
              <span>{quizStats.correct} Correct</span>
            </div>
            <div className="stat-item-modern">
              <Brain size={16} />
              <span>
                {currentIndex + 1} / {quiz.quiz.length}
              </span>
            </div>
            <div className="stat-item-modern">
              <Zap size={16} />
              <span>
                {Math.round(((currentIndex + 1) / quiz.quiz.length) * 100)}%
              </span>
            </div>
            {timeRemaining && (
              <div className="stat-item-modern timer">
                <Clock size={16} />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container-modern">
          <div className="progress-bar-modern">
            <motion.div
              className="progress-fill-modern"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentIndex + 1) / quiz.quiz.length) * 100}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="progress-text-modern">
            Question {currentIndex + 1} of {quiz.quiz.length}
          </div>
        </div>
      </motion.div>

      {/* Main Quiz Area */}
      <div className="quiz-main-modern">
        <div className="quiz-container-modern">
          <motion.div
            className="question-card-modern"
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
          >
            <div className="question-header-modern">
              <div className="question-number-modern">
                Question {currentIndex + 1}
              </div>
              <div className="question-actions-modern">
                <motion.button
                  onClick={() => setShowHint(!showHint)}
                  className={`hint-btn ${
                    hintUsed.has(currentIndex) ? "used" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={hintUsed.has(currentIndex)}
                >
                  <Lightbulb size={16} />
                  {hintUsed.has(currentIndex) ? "Hint Used" : "Get Hint"}
                </motion.button>
                {isVoiceSupported && (
                  <motion.button
                    onClick={
                      isListening ? stopVoiceRecognition : startVoiceRecognition
                    }
                    className={`voice-btn ${isListening ? "listening" : ""}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isAnswered}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    {isListening ? "Listening..." : "Voice"}
                  </motion.button>
                )}
              </div>
            </div>

            <div className="question-content-modern">
              <h3 className="question-text-modern">{current.question}</h3>

              {showHint && !hintUsed.has(currentIndex) && (
                <motion.div
                  className="hint-box-modern"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="hint-content">
                    <HelpCircle size={16} />
                    <span>
                      Hint: Try to eliminate obviously wrong options first
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="options-container-modern">
                {current.options.map((opt, idx) => {
                  const label = current.option_labels[idx];
                  const isSelected = selectedOption === label;
                  const isRight = label === current.correct_option;

                  return (
                    <motion.button
                      key={label}
                      className={`option-btn-modern ${
                        isSelected ? (isRight ? "correct" : "incorrect") : ""
                      } ${isAnswered && isRight ? "show-correct" : ""}`}
                      onClick={() => handleOptionClick(label)}
                      disabled={isAnswered}
                      whileHover={{ scale: isAnswered ? 1 : 1.02 }}
                      whileTap={{ scale: isAnswered ? 1 : 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="option-label-modern">{label}</div>
                      <div className="option-text-modern">{opt}</div>
                      {isAnswered && (
                        <div className="option-icon-modern">
                          {isRight ? (
                            <CheckCircle size={20} />
                          ) : (
                            <XCircle size={20} />
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {isAnswered && (
                <motion.div
                  className={`feedback-modern ${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="feedback-icon">
                    {isCorrect ? (
                      <CheckCircle size={24} />
                    ) : (
                      <XCircle size={24} />
                    )}
                  </div>
                  <div className="feedback-text">
                    {isCorrect
                      ? "Excellent! You got it right!"
                      : "Not quite right, but keep learning!"}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Navigation Controls */}
          <div className="navigation-controls-modern">
            <motion.button
              onClick={goBackToLecture}
              className="nav-btn-modern back-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={20} />
              Back to Lecture
            </motion.button>

            <div className="nav-center-modern">
              <motion.button
                onClick={previousQuestion}
                disabled={currentIndex === 0}
                className="nav-btn-modern prev-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft size={20} />
                Previous
              </motion.button>

              <motion.button
                onClick={nextQuestion}
                className="nav-btn-modern next-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {currentIndex === quiz.quiz.length - 1 ? "Finish" : "Next"}
                <ChevronRight size={20} />
              </motion.button>
            </div>

            <motion.button
              onClick={async () => {
                setIsGeneratingFlashcards(true);
                try {
                  const response = await fetch(
                    `${API_BASE_URL}${API_ENDPOINT}/flashcards?num_cards=10`
                  );
                  const data = await response.json();

                  if (data.status === "success") {
                    window.location.href = `/ai-teacher/class7/mathematics/algebra/level1/flashcards?data=${encodeURIComponent(
                      JSON.stringify(data.data)
                    )}`;
                  }
                } catch (error) {
                  console.error("Error generating flashcards:", error);
                } finally {
                  setIsGeneratingFlashcards(false);
                }
              }}
              className="nav-btn-modern flashcards-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isGeneratingFlashcards}
            >
              {isGeneratingFlashcards ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen size={20} />
                  Generate Flashcards
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Enhanced Explanation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="explanation-modal-overlay-modern"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="explanation-modal-modern"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-modern">
                <div className="modal-title-modern">
                  <Lightbulb size={24} />
                  Detailed Explanation
                </div>
                <button
                  className="modal-close-modern"
                  onClick={() => setShowModal(false)}
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="modal-content-modern">
                {/* Result Banner */}
                <motion.div
                  className={`result-banner-modern ${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="result-icon">
                    {isCorrect ? (
                      <CheckCircle size={32} />
                    ) : (
                      <XCircle size={32} />
                    )}
                  </div>
                  <div className="result-text">
                    <h3>{isCorrect ? "Correct Answer!" : "Not Quite Right"}</h3>
                    <p>
                      {isCorrect
                        ? "Great job! You understood this concept perfectly."
                        : "Don't worry, this is how we learn. Let's understand why."}
                    </p>
                  </div>
                </motion.div>

                {/* Correct Answer Explanation */}
                <motion.div
                  className="explanation-section-modern"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="section-header-modern">
                    <Target size={20} />
                    <h4>Why the correct answer is right:</h4>
                  </div>
                  <div className="section-content-modern">
                    {current.explain_correct}
                  </div>
                </motion.div>

                {/* All Options Explanations */}
                <motion.div
                  className="options-explanation-modern"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="section-header-modern">
                    <Brain size={20} />
                    <h4>Understanding all options:</h4>
                  </div>
                  <div className="options-grid-modern">
                    {current.option_labels.map((label) => (
                      <motion.div
                        key={label}
                        className={`option-explanation-modern ${
                          label === current.correct_option
                            ? "correct"
                            : "incorrect"
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + parseInt(label) * 0.1 }}
                      >
                        <div className="option-header-modern">
                          <div className="option-label-explanation">
                            {label === current.correct_option ? "✅" : "❌"}{" "}
                            Option {label}
                          </div>
                          <div className="option-status">
                            {label === current.correct_option
                              ? "Correct"
                              : "Incorrect"}
                          </div>
                        </div>
                        <div className="option-explanation-text">
                          {current.explanations[label]}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="modal-actions-modern"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <motion.button
                    onClick={() => setShowModal(false)}
                    className="action-btn-modern primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Got It!
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowModal(false);
                      nextQuestion();
                    }}
                    className="action-btn-modern secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Next Question
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced CSS Styles */}
      <style jsx>{`
        .quiz-page-container {
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #1e293b 50%,
            #0f172a 100%
          );
          position: relative;
          overflow: hidden;
        }

        .quiz-page-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
              circle at 20% 80%,
              rgba(99, 102, 241, 0.1) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(139, 92, 246, 0.1) 0%,
              transparent 50%
            );
          pointer-events: none;
        }

        /* Loading Screen */
        .loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner-modern {
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem;
          position: relative;
        }

        .spinner-ring {
          width: 100%;
          height: 100%;
          border: 3px solid rgba(99, 102, 241, 0.3);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
        }

        .spinner-glow {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.3),
            transparent
          );
          border-radius: 50%;
        }

        /* Error Screen */
        .error-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
        }

        .error-content {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .back-to-lecture-btn-modern {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 2rem;
        }

        /* Results Screen */
        .results-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
        }

        .results-content {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 600px;
          width: 100%;
        }

        .results-header {
          margin-bottom: 2rem;
        }

        .grade-display {
          margin-bottom: 1rem;
        }

        .grade-icon {
          font-size: 4rem;
          margin-bottom: 0.5rem;
        }

        .grade-text {
          font-size: 3rem;
          font-weight: 900;
          margin: 0;
        }

        .score-text {
          font-size: 2rem;
          color: white;
          margin: 0.5rem 0;
        }

        .results-header h3 {
          color: white;
          font-size: 1.5rem;
          margin: 1rem 0 0.5rem 0;
        }

        .results-header p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .results-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-icon {
          color: #6366f1;
        }

        .stat-icon.correct {
          color: #10b981;
        }

        .stat-icon.incorrect {
          color: #ef4444;
        }

        .stat-content {
          text-align: left;
        }

        .stat-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .results-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .action-btn.secondary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .action-btn.tertiary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Header */
        .quiz-header-modern {
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-left-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          font-size: 2rem;
        }

        .header-text h1 {
          color: white;
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.7);
          margin: 0.5rem 0 0 0;
        }

        .header-stats-modern {
          display: flex;
          gap: 2rem;
        }

        .stat-item-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }

        .stat-item-modern.timer {
          color: #f59e0b;
        }

        /* Progress Bar */
        .progress-container-modern {
          max-width: 1200px;
          margin: 1rem auto 0;
        }

        .progress-bar-modern {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill-modern {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 4px;
        }

        .progress-text-modern {
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }

        /* Main Quiz */
        .quiz-main-modern {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .quiz-container-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .question-card-modern {
          width: 100%;
          max-width: 800px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05)
          );
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .question-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .question-number-modern {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .question-actions-modern {
          display: flex;
          gap: 0.5rem;
        }

        .hint-btn,
        .voice-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .hint-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .hint-btn.used {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          cursor: not-allowed;
        }

        .voice-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .voice-btn.listening {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .question-content-modern {
          margin-bottom: 1.5rem;
        }

        .question-text-modern {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.4;
          margin: 0 0 1.5rem 0;
        }

        .hint-box-modern {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .hint-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f59e0b;
          font-weight: 600;
        }

        .options-container-modern {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .option-btn-modern {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          text-align: left;
          width: 100%;
        }

        .option-btn-modern:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .option-btn-modern.correct {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
        }

        .option-btn-modern.incorrect {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .option-btn-modern.show-correct {
          background: rgba(16, 185, 129, 0.2);
          border-color: #10b981;
        }

        .option-btn-modern:disabled {
          cursor: not-allowed;
        }

        .option-label-modern {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .option-text-modern {
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
          flex: 1;
        }

        .option-icon-modern {
          flex-shrink: 0;
        }

        .feedback-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          margin-top: 1rem;
        }

        .feedback-modern.correct {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .feedback-modern.incorrect {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .feedback-icon {
          flex-shrink: 0;
        }

        .feedback-modern.correct .feedback-icon {
          color: #10b981;
        }

        .feedback-modern.incorrect .feedback-icon {
          color: #ef4444;
        }

        .feedback-text {
          color: white;
          font-weight: 600;
        }

        /* Navigation Controls */
        .navigation-controls-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 800px;
        }

        .nav-center-modern {
          display: flex;
          gap: 1rem;
        }

        .nav-btn-modern {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .prev-btn,
        .next-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .flashcards-btn {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .nav-btn-modern:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Explanation Modal */
        .explanation-modal-overlay-modern {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .explanation-modal-modern {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05)
          );
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem 2rem 1rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .modal-close-modern {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modal-close-modern:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-content-modern {
          padding: 2rem;
        }

        .result-banner-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .result-banner-modern.correct {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .result-banner-modern.incorrect {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .result-icon {
          flex-shrink: 0;
        }

        .result-banner-modern.correct .result-icon {
          color: #10b981;
        }

        .result-banner-modern.incorrect .result-icon {
          color: #ef4444;
        }

        .result-text h3 {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .result-text p {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .explanation-section-modern {
          margin-bottom: 2rem;
        }

        .section-header-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .section-header-modern h4 {
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }

        .section-content-modern {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }

        .options-explanation-modern {
          margin-bottom: 2rem;
        }

        .options-grid-modern {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .option-explanation-modern {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .option-explanation-modern.correct {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }

        .option-explanation-modern.incorrect {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }

        .option-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .option-label-explanation {
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .option-status {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .option-explanation-text {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }

        .modal-actions-modern {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .action-btn-modern {
          padding: 1rem 2rem;
          border: none;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-btn-modern.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .action-btn-modern.secondary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .header-content-modern {
            flex-direction: column;
            gap: 1rem;
          }

          .header-stats-modern {
            gap: 1rem;
          }

          .question-card-modern {
            padding: 1.5rem;
          }

          .navigation-controls-modern {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-center-modern {
            order: 2;
          }

          .results-stats {
            grid-template-columns: 1fr;
          }

          .results-actions {
            flex-direction: column;
          }

          .explanation-modal-modern {
            margin: 1rem;
            max-height: calc(100vh - 2rem);
          }

          .modal-content-modern {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizPage;
