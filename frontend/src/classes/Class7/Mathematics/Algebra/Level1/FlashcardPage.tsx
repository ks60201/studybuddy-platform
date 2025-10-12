import React, { useState, useEffect } from "react";
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
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  const goBackToLecture = () => {
    window.location.href = "/ai-teacher/class7/mathematics/algebra/level1";
  };

  if (loading) {
    return (
      <div className="flashcard-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading your flashcards...</p>
      </div>
    );
  }

  if (
    !flashcards ||
    !flashcards.flashcards ||
    flashcards.flashcards.length === 0
  ) {
    return (
      <div className="flashcard-page-error">
        <div className="error-content">
          <h2>❌ No Flashcards Found</h2>
          <p>
            Sorry, we couldn't load your flashcards. Please go back and generate
            them again.
          </p>
          <button onClick={goBackToLecture} className="back-to-lecture-btn">
            🔙 Back to Lecture
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-page">
      {/* Clean Modern Header */}
      <div className="flashcard-page-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🎴 {flashcards.title}</h1>
            <p className="subtitle">
              {flashcards.class_level} • {flashcards.subject} •{" "}
              {flashcards.topic}
            </p>
          </div>
          <div className="header-info">
            <div className="session-stats">
              <div className="stat-item">
                <span className="stat-value">{currentFlashcardIndex + 1}</span>
                <span className="stat-label">Current</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {flashcards.flashcards.length}
                </span>
                <span className="stat-label">Total Cards</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Math.round(
                    ((currentFlashcardIndex + 1) /
                      flashcards.flashcards.length) *
                      100
                  )}
                  %
                </span>
                <span className="stat-label">Progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Flashcard Area */}
      <div className="flashcard-page-main">
        <div className="flashcard-container-large">
          <div
            className={`flashcard-large ${isFlashcardFlipped ? "flipped" : ""}`}
            onClick={flipFlashcard}
          >
            {/* Question Side */}
            <div className="flashcard-front-large">
              <div className="flashcard-content-large">
                <div className="question-label-large">❓ Question</div>
                <div className="question-text-large">
                  {flashcards.flashcards[currentFlashcardIndex]?.question}
                </div>
                <div className="flip-instruction-large">
                  👆 Click to reveal answer
                </div>
              </div>
            </div>

            {/* Answer Side */}
            <div className="flashcard-back-large">
              <div className="flashcard-content-large">
                <div className="answer-label-large">✅ Answer</div>
                <div className="answer-text-large">
                  {flashcards.flashcards[currentFlashcardIndex]?.answer}
                </div>
                <div className="topic-badge-large">
                  📚 {flashcards.flashcards[currentFlashcardIndex]?.topic}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flashcard-controls-large">
            <button onClick={goBackToLecture} className="back-to-lecture-btn">
              🔙 Back to Lecture
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                previousFlashcard();
              }}
              disabled={currentFlashcardIndex === 0}
              className="flashcard-nav-btn-large prev"
            >
              ⬅️ Previous
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                flipFlashcard();
              }}
              className="flip-btn-large"
            >
              {isFlashcardFlipped ? "🔄 Show Question" : "💡 Show Answer"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextFlashcard();
              }}
              disabled={
                currentFlashcardIndex === flashcards.flashcards.length - 1
              }
              className="flashcard-nav-btn-large next"
            >
              Next ➡️
            </button>

            {/* Generate AI Quiz Button */}
            <button
              onClick={() => {
                window.location.href = `/ai-teacher/class7/mathematics/algebra/level1/quiz`;
              }}
              className="flashcard-nav-btn-large"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "2px solid #10b981",
                color: "#ffffff",
              }}
            >
              📝 Generate AI Quiz
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="flashcard-progress-large">
            <div className="progress-dots-large">
              {flashcards.flashcards.map((_, index) => (
                <div
                  key={index}
                  className={`progress-dot-large ${
                    index === currentFlashcardIndex ? "active" : ""
                  }`}
                  onClick={() => {
                    setCurrentFlashcardIndex(index);
                    setIsFlashcardFlipped(false);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flashcard-stats-large">
            <div className="stat-item-large">
              <span className="stat-label-large">Total Cards:</span>
              <span className="stat-value-large">{flashcards.total_cards}</span>
            </div>
            <div className="stat-item-large">
              <span className="stat-label-large">Subject:</span>
              <span className="stat-value-large">{flashcards.subject}</span>
            </div>
            <div className="stat-item-large">
              <span className="stat-label-large">Generated:</span>
              <span className="stat-value-large">
                {new Date(flashcards.generated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flashcard-page-footer">
        <p>
          🎯 Study tip: Try to answer before flipping the card for better
          retention!
        </p>
      </div>
    </div>
  );
};

export default FlashcardPage;
