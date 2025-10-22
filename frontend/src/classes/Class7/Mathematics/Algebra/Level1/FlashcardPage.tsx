import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import "./Level1.css";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic: string;
  difficulty: string;
  subject: string;
  class_level: string;
}

interface FlashcardSet {
  title: string;
  class_level: string;
  subject: string;
  topic: string;
  total_cards: number;
  flashcards: Flashcard[];
  generated_at: string;
  difficulty_level: string;
}

const FlashcardPage: React.FC = () => {
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<"normal" | "review" | "test">(
    "normal"
  );
  const [correctAnswers, setCorrectAnswers] = useState<Set<number>>(new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<number>>(
    new Set()
  );
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Get flashcard data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const flashcardData = urlParams.get("data");

    if (flashcardData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(flashcardData));
        setFlashcards(parsedData);
      } catch (error) {
        console.error("Error parsing flashcard data:", error);
      }
    }
    setLoading(false);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlay && flashcards) {
      const interval = setInterval(() => {
        // First show the answer
        setIsFlashcardFlipped(true);

        // After 2 seconds, move to next card and reset flip state
        setTimeout(() => {
          if (currentFlashcardIndex < flashcards.flashcards.length - 1) {
            setCurrentFlashcardIndex((prev) => prev + 1);
            setIsFlashcardFlipped(false);
          } else {
            setIsAutoPlay(false);
            setIsFlashcardFlipped(false);
          }
        }, 2000);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlay, currentFlashcardIndex, flashcards]);

  // Flashcard navigation functions
  const nextFlashcard = () => {
    if (
      flashcards &&
      currentFlashcardIndex < flashcards.flashcards.length - 1
    ) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setIsFlashcardFlipped(false);
    }
  };

  const previousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setIsFlashcardFlipped(false);
    }
  };

  const flipFlashcard = () => {
    console.log(
      "FlashcardPage - Before flip - isFlashcardFlipped:",
      isFlashcardFlipped
    );
    setIsFlashcardFlipped(!isFlashcardFlipped);
    console.log("FlashcardPage - After flip - new value:", !isFlashcardFlipped);
  };

  const goBackToLecture = () => {
    window.location.href = "/ai-teacher/class7/mathematics/algebra/level1";
  };

  const markAsCorrect = () => {
    setCorrectAnswers((prev) => new Set([...prev, currentFlashcardIndex]));
    setIncorrectAnswers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentFlashcardIndex);
      return newSet;
    });
  };

  const markAsIncorrect = () => {
    setIncorrectAnswers((prev) => new Set([...prev, currentFlashcardIndex]));
    setCorrectAnswers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentFlashcardIndex);
      return newSet;
    });
  };

  const resetProgress = () => {
    setCorrectAnswers(new Set());
    setIncorrectAnswers(new Set());
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
  };

  const getProgressPercentage = () => {
    if (!flashcards) return 0;
    return Math.round(
      ((currentFlashcardIndex + 1) / flashcards.flashcards.length) * 100
    );
  };

  const getMasteryPercentage = () => {
    if (!flashcards) return 0;
    return Math.round(
      (correctAnswers.size / flashcards.flashcards.length) * 100
    );
  };

  if (loading) {
    return (
      <div className="flashcard-page-container">
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
              Preparing Your Study Session
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Loading flashcards with AI-powered insights...
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (
    !flashcards ||
    !flashcards.flashcards ||
    flashcards.flashcards.length === 0
  ) {
    return (
      <div className="flashcard-page-container">
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
              📚
            </motion.div>
            <h2>No Flashcards Available</h2>
            <p>
              We couldn't find your flashcards. Please generate them from your
              lecture first.
            </p>
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

  const currentCard = flashcards.flashcards[currentFlashcardIndex];
  const isCorrect = correctAnswers.has(currentFlashcardIndex);
  const isIncorrect = incorrectAnswers.has(currentFlashcardIndex);

  return (
    <div className="flashcard-page-container">
      {/* Modern Header */}
      <motion.div
        className="flashcard-header-modern"
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
              🎴
            </motion.div>
            <div className="header-text">
              <h1>{flashcards.title}</h1>
              <p className="header-subtitle">
                {flashcards.class_level} • {flashcards.subject} •{" "}
                {flashcards.topic}
              </p>
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}
              >
                DEBUG: State:{" "}
                {isFlashcardFlipped ? "SHOWING ANSWER" : "SHOWING QUESTION"}
              </div>
            </div>
          </div>

          <div className="header-stats-modern">
            <div className="stat-item-modern">
              <Target size={16} />
              <span>{getMasteryPercentage()}% Mastery</span>
            </div>
            <div className="stat-item-modern">
              <Brain size={16} />
              <span>
                {currentFlashcardIndex + 1} / {flashcards.flashcards.length}
              </span>
            </div>
            <div className="stat-item-modern">
              <Zap size={16} />
              <span>{getProgressPercentage()}% Complete</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container-modern">
          <div className="progress-bar-modern">
            <motion.div
              className="progress-fill-modern"
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="progress-text-modern">
            {getProgressPercentage()}% Complete
          </div>
        </div>
      </motion.div>

      {/* Main Flashcard Area */}
      <div className="flashcard-main-modern">
        <div className="flashcard-container-modern">
          <motion.div
            className={`flashcard-modern ${
              isFlashcardFlipped ? "flipped" : ""
            } ${isCorrect ? "correct" : isIncorrect ? "incorrect" : ""}`}
            onClick={flipFlashcard}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {/* Question Side */}
            <div className="flashcard-front-modern">
              <div className="card-header-modern">
                <div className="card-badge-modern question-badge">
                  <Brain size={16} />
                  Question
                </div>
                <div className="card-number-modern">
                  {currentFlashcardIndex + 1}
                </div>
              </div>
              <div className="card-content-modern">
                <h3 className="card-title-modern">{currentCard?.question}</h3>
                <div className="card-topic-modern">
                  <BookOpen size={14} />
                  {currentCard?.topic}
                </div>
              </div>
              <div className="card-footer-modern">
                <div className="flip-hint-modern">
                  <Sparkles size={16} />
                  Click to reveal answer
                </div>
                <div
                  style={{ fontSize: "10px", color: "#999", marginTop: "10px" }}
                >
                  DEBUG: This is the QUESTION side
                </div>
              </div>
            </div>

            {/* Answer Side */}
            <div className="flashcard-back-modern">
              <div className="card-header-modern">
                <div className="card-badge-modern answer-badge">
                  <Target size={16} />
                  Answer
                </div>
                <div className="card-number-modern">
                  {currentFlashcardIndex + 1}
                </div>
              </div>
              <div className="card-content-modern">
                <h3 className="card-title-modern">{currentCard?.answer}</h3>
                <div className="card-topic-modern">
                  <BookOpen size={14} />
                  {currentCard?.topic}
                </div>
              </div>
              <div className="card-footer-modern">
                <div className="flip-hint-modern">
                  <Star size={16} />
                  Click to see question
                </div>
                <div
                  style={{ fontSize: "10px", color: "#999", marginTop: "10px" }}
                >
                  DEBUG: This is the ANSWER side
                </div>
              </div>
            </div>
          </motion.div>

          {/* Study Controls */}
          <div className="study-controls-modern">
            <motion.button
              onClick={markAsCorrect}
              className={`control-btn-modern correct-btn ${
                isCorrect ? "active" : ""
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Target size={20} />
              Got It Right
            </motion.button>

            <motion.button
              onClick={markAsIncorrect}
              className={`control-btn-modern incorrect-btn ${
                isIncorrect ? "active" : ""
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={20} />
              Need Practice
            </motion.button>
          </div>
        </div>

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
              onClick={previousFlashcard}
              disabled={currentFlashcardIndex === 0}
              className="nav-btn-modern prev-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft size={20} />
              Previous
            </motion.button>

            <motion.button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`nav-btn-modern autoplay-btn ${
                isAutoPlay ? "active" : ""
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
              {isAutoPlay ? "Pause" : "Auto Play"}
            </motion.button>

            <motion.button
              onClick={nextFlashcard}
              disabled={
                currentFlashcardIndex === flashcards.flashcards.length - 1
              }
              className="nav-btn-modern next-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronRight size={20} />
            </motion.button>
          </div>

          <motion.button
            onClick={() =>
              (window.location.href = `/ai-teacher/class7/mathematics/algebra/level1/quiz`)
            }
            className="nav-btn-modern quiz-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Brain size={20} />
            Take Quiz
          </motion.button>
        </div>

        {/* Progress Dots */}
        <div className="progress-dots-modern">
          {flashcards.flashcards.map((_, index) => (
            <motion.div
              key={index}
              className={`progress-dot-modern ${
                index === currentFlashcardIndex ? "active" : ""
              } ${correctAnswers.has(index) ? "correct" : ""} ${
                incorrectAnswers.has(index) ? "incorrect" : ""
              }`}
              onClick={() => {
                setCurrentFlashcardIndex(index);
                setIsFlashcardFlipped(false);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Stats Panel */}
        <motion.div
          className="stats-panel-modern"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="stats-grid-modern">
            <div className="stat-card-modern">
              <div className="stat-icon-modern">
                <Target size={24} />
              </div>
              <div className="stat-content-modern">
                <div className="stat-value-modern">{correctAnswers.size}</div>
                <div className="stat-label-modern">Correct</div>
              </div>
            </div>

            <div className="stat-card-modern">
              <div className="stat-icon-modern">
                <RotateCcw size={24} />
              </div>
              <div className="stat-content-modern">
                <div className="stat-value-modern">{incorrectAnswers.size}</div>
                <div className="stat-label-modern">Need Practice</div>
              </div>
            </div>

            <div className="stat-card-modern">
              <div className="stat-icon-modern">
                <Zap size={24} />
              </div>
              <div className="stat-content-modern">
                <div className="stat-value-modern">
                  {getMasteryPercentage()}%
                </div>
                <div className="stat-label-modern">Mastery</div>
              </div>
            </div>
          </div>

          <motion.button
            onClick={resetProgress}
            className="reset-btn-modern"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} />
            Reset Progress
          </motion.button>
        </motion.div>
      </div>

      {/* Enhanced CSS Styles */}
      <style>{`
        .flashcard-page-container {
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

        .flashcard-page-container::before {
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

        /* Header */
        .flashcard-header-modern {
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

        /* Main Flashcard */
        .flashcard-main-modern {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .flashcard-container-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .flashcard-modern {
          width: 100%;
          max-width: 600px;
          height: 400px;
          perspective: 1000px;
          cursor: pointer;
          position: relative;
        }

        .flashcard-modern.flipped {
          transform: rotateY(180deg);
        }

        .flashcard-front-modern,
        .flashcard-back-modern {
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05)
          );
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backface-visibility: hidden;
        }

        .flashcard-back-modern {
          transform: rotateY(180deg);
        }

        .flashcard-modern.correct {
          border-color: #10b981;
          box-shadow: 0 20px 60px rgba(16, 185, 129, 0.3);
        }

        .flashcard-modern.incorrect {
          border-color: #ef4444;
          box-shadow: 0 20px 60px rgba(239, 68, 68, 0.3);
        }

        .card-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-badge-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .question-badge {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .answer-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .card-number-modern {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .card-content-modern {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .card-title-modern {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.4;
          margin: 0;
        }

        .card-topic-modern {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .card-footer-modern {
          text-align: center;
        }

        .flip-hint-modern {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }

        /* Study Controls */
        .study-controls-modern {
          display: flex;
          gap: 1rem;
        }

        .control-btn-modern {
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

        .correct-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .correct-btn.active {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        .incorrect-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .incorrect-btn.active {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
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

        .autoplay-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .autoplay-btn.active {
          background: linear-gradient(135deg, #d97706, #b45309);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
        }

        .quiz-btn {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .nav-btn-modern:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Progress Dots */
        .progress-dots-modern {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .progress-dot-modern {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .progress-dot-modern.active {
          background: #6366f1;
          transform: scale(1.2);
        }

        .progress-dot-modern.correct {
          background: #10b981;
        }

        .progress-dot-modern.incorrect {
          background: #ef4444;
        }

        /* Stats Panel */
        .stats-panel-modern {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stats-grid-modern {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card-modern {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-icon-modern {
          color: #6366f1;
          margin-bottom: 0.5rem;
        }

        .stat-value-modern {
          color: white;
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        .stat-label-modern {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .reset-btn-modern {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 auto;
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

          .flashcard-modern {
            height: 350px;
          }

          .navigation-controls-modern {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-center-modern {
            order: 2;
          }

          .stats-grid-modern {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default FlashcardPage;
