import React, { useEffect, useState } from "react";
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

  // Add state for modal
  const [showModal, setShowModal] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  useEffect(() => {
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
        } else {
          setError(data.message || "Failed to load quiz");
        }
      } catch (err) {
        setError("Failed to connect to server for quiz");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, []);

  if (loading) {
    return (
      <div className="flashcard-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your quiz...</p>
      </div>
    );
  }

  if (error || !quiz || !quiz.quiz || quiz.quiz.length === 0) {
    return (
      <div className="flashcard-page-error">
        <div className="error-content">
          <h2>❌ No Quiz Found</h2>
          <p>
            {error || "Sorry, we couldn't load your quiz. Please try again."}
          </p>
          <button
            onClick={() =>
              (window.location.href =
                "/ai-teacher/class7/science/physics/waves/level1")
            }
            className="back-to-lecture-btn"
          >
            🔙 Back to Lecture
          </button>
        </div>
      </div>
    );
  }

  const current = quiz.quiz[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === current.correct_option;

  const handleOptionClick = (label: string) => {
    if (!isAnswered) {
      setSelectedOption(label);
      setShowExplanation(true);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const nextQuestion = () => {
    if (currentIndex < quiz.quiz.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      // Do NOT setShowModal(false) here
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowExplanation(false);
      // Do NOT setShowModal(false) here
    }
  };

  const goBackToLecture = () => {
    window.location.href = "/ai-teacher/class7/science/physics/waves/level1";
  };

  return (
    <div className="flashcard-page">
      {/* Header */}
      <div className="flashcard-page-header">
        <div className="header-content">
          <div className="header-left">
            <h1>📝 {quiz.title}</h1>
            <p className="subtitle">
              {quiz.class_level} • {quiz.subject} • {quiz.topic}
            </p>
          </div>
          <div className="header-info">
            <div className="session-stats">
              <div className="stat-item">
                <span className="stat-value">{currentIndex + 1}</span>
                <span className="stat-label">Current</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{quiz.quiz.length}</span>
                <span className="stat-label">Total Qs</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(((currentIndex + 1) / quiz.quiz.length) * 100)}%
                </span>
                <span className="stat-label">Progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Quiz Area */}
      <div className="flashcard-page-main">
        <div className="flashcard-container-large">
          <div className="flashcard-large quiz-card">
            {/* Question Section */}
            <div className="quiz-front">
              <div className="quiz-question-section">
                <div className="quiz-question-text">{current.question}</div>
                <div className="quiz-options">
                  {current.options.map((opt, idx) => {
                    const label = current.option_labels[idx];
                    const isSelected = selectedOption === label;
                    const isRight = label === current.correct_option;
                    return (
                      <button
                        key={label}
                        className={`quiz-option-btn ${
                          isSelected ? (isRight ? "correct" : "incorrect") : ""
                        } ${isAnswered && isRight ? "show-correct" : ""}`}
                        onClick={() => handleOptionClick(label)}
                        disabled={isAnswered}
                      >
                        <span className="option-label">{label}.</span> {opt}
                      </button>
                    );
                  })}
                </div>
                {isAnswered && (
                  <div
                    className={`quiz-feedback ${
                      isCorrect ? "correct" : "incorrect"
                    }`}
                  >
                    {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flashcard-progress-large">
              <div className="progress-dots-large">
                {quiz.quiz.map((_, index) => (
                  <div
                    key={index}
                    className={`progress-dot-large ${
                      index === currentIndex ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentIndex(index);
                      setSelectedOption(null);
                      setShowExplanation(false);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flashcard-stats-large">
              <div className="stat-item-large">
                <span className="stat-label-large">Total Qs:</span>
                <span className="stat-value-large">{quiz.total_questions}</span>
              </div>
              <div className="stat-item-large">
                <span className="stat-label-large">Subject:</span>
                <span className="stat-value-large">{quiz.subject}</span>
              </div>
              <div className="stat-item-large">
                <span className="stat-label-large">Generated:</span>
                <span className="stat-value-large">
                  {new Date(quiz.generated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flashcard-controls-large">
            <button
              onClick={goBackToLecture}
              className="back-to-lecture-btn"
              disabled={showModal}
            >
              🔙 Back to Lecture
            </button>

            <button
              onClick={previousQuestion}
              disabled={currentIndex === 0 || showModal}
              className="flashcard-nav-btn-large prev"
            >
              ⬅️ Previous
            </button>

            <button
              onClick={nextQuestion}
              disabled={currentIndex === quiz.quiz.length - 1 || showModal}
              className="flashcard-nav-btn-large next"
            >
              Next ➡️
            </button>

            {/* Generate Flashcards Button */}
            <button
              onClick={async () => {
                setIsGeneratingFlashcards(true);
                try {
                  const response = await fetch(
                    `${API_BASE_URL}${API_ENDPOINT}/flashcards?num_cards=10`
                  );
                  const data = await response.json();

                  if (data.status === "success") {
                    window.location.href = `/ai-teacher/class7/science/physics/waves/level1/flashcards?data=${encodeURIComponent(
                      JSON.stringify(data.data)
                    )}`;
                  } else {
                    console.error(
                      "Failed to generate flashcards:",
                      data.message
                    );
                  }
                } catch (error) {
                  console.error("Error generating flashcards:", error);
                } finally {
                  setIsGeneratingFlashcards(false);
                }
              }}
              className="flashcard-nav-btn-large"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                border: "2px solid #8b5cf6",
                color: "#ffffff",
              }}
              disabled={showModal || isGeneratingFlashcards}
            >
              {isGeneratingFlashcards ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Generating...
                </>
              ) : (
                "🎴 Generate Flashcards"
              )}
            </button>
          </div>

          {/* Explanation Modal */}
          {showModal && (
            <div className="explanation-modal-overlay">
              <div
                className="explanation-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="explanation-modal-header">
                  <div className="explanation-modal-title">
                    🧠 Detailed Explanation
                  </div>
                  <button
                    className="explanation-modal-close"
                    onClick={closeModal}
                  >
                    ✕
                  </button>
                </div>

                <div className="explanation-modal-content">
                  {/* Result Banner */}
                  <div
                    className={`explanation-modal-result ${
                      isCorrect ? "correct" : "incorrect"
                    }`}
                  >
                    {isCorrect ? (
                      <>✅ Correct Answer!</>
                    ) : (
                      <>❌ Not quite right.</>
                    )}
                  </div>

                  {/* Correct Answer Explanation */}
                  <div className="explanation-modal-section">
                    <div className="explanation-modal-section-title">
                      Why the correct answer is right:
                    </div>
                    <div className="explanation-modal-section-content">
                      {current.explain_correct}
                    </div>
                  </div>

                  {/* All Options Explanations */}
                  <div className="explanation-modal-options">
                    {current.option_labels.map((label) => (
                      <div
                        key={label}
                        className={`explanation-modal-option ${
                          label === current.correct_option
                            ? "correct"
                            : "incorrect"
                        }`}
                      >
                        <div className="explanation-modal-option-label">
                          {label === current.correct_option ? "✅" : "❌"}{" "}
                          Option {label}
                        </div>
                        <div className="explanation-modal-option-text">
                          {current.explanations[label]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flashcard-page-footer">
        <p>
          🧠 Tip: Read the explanations for every option to master the concepts!
        </p>
      </div>
    </div>
  );
};

export default QuizPage;
