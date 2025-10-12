import React, { useState, useEffect, useRef } from "react";
import "./InteractiveDiagram.css";

interface DiagramLabel {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  color: string;
}

interface InteractiveDiagramProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  labels: DiagramLabel[];
  onLabelClick: (label: DiagramLabel) => void;
  currentExplanation: string | null;
  isExplaining: boolean;
  transcript: any[];
  interactiveTranscript: any[];
}

const InteractiveDiagram: React.FC<InteractiveDiagramProps> = ({
  isOpen,
  onClose,
  imageUrl,
  labels,
  onLabelClick,
  currentExplanation,
  isExplaining,
  transcript,
  interactiveTranscript,
}) => {
  const [selectedLabel, setSelectedLabel] = useState<DiagramLabel | null>(null);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // User controls when to close - no auto-close functionality

  const handleLabelClick = (label: DiagramLabel, event: React.MouseEvent) => {
    setSelectedLabel(label);
    onLabelClick(label);
    // Prevent the click from bubbling up to the backdrop
    event.stopPropagation();
  };

  const toggleShowAllLabels = () => {
    setShowAllLabels(!showAllLabels);
  };

  // Show only first 5 labels initially, or all if showAllLabels is true
  const visibleLabels = showAllLabels ? labels : labels.slice(0, 5);
  const hasMoreLabels = labels.length > 5;

  if (!isOpen) return null;

  return (
    <div className="interactive-diagram-overlay">
      <div className="interactive-diagram-backdrop" onClick={onClose}></div>
      <div className="interactive-diagram-content">
        <div className="interactive-diagram-header">
          <div className="header-left">
            <h2>🌊 Interactive Wave Diagram</h2>
            <div className="lecture-status-indicator">
              <span className="status-icon">⏸️</span>
              <span className="status-text">Lecture Paused</span>
            </div>
          </div>
          <div className="header-right">
            <button className="interactive-diagram-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="interactive-diagram-main">
          {/* Left Side - Diagram with Labels */}
          <div className="diagram-section">
            <div className="diagram-container">
              <img
                src={imageUrl}
                alt="Wave Diagram"
                className="diagram-image"
              />

              {/* Clickable Labels Overlay */}
              <div className="labels-overlay">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    className={`diagram-label ${
                      selectedLabel?.id === label.id ? "selected" : ""
                    }`}
                    style={{
                      left: `${label.position.x}%`,
                      top: `${label.position.y}%`,
                      backgroundColor: label.color,
                    }}
                    onClick={(e) => handleLabelClick(label, e)}
                    title={label.description}
                  >
                    <span className="label-icon">📍</span>
                    <span className="label-name">{label.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Labels List and Transcript */}
          <div className="interactive-sidebar">
            {/* Labels List */}
            <div className="labels-section">
              <h3>📋 Clickable Labels</h3>
              <div className="labels-list">
                {visibleLabels.map((label, index) => (
                  <button
                    key={label.id}
                    className={`label-item ${
                      selectedLabel?.id === label.id ? "active" : ""
                    }`}
                    onClick={(e) => handleLabelClick(label, e)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div
                      className="label-color-dot"
                      style={{ backgroundColor: label.color }}
                    ></div>
                    <div className="label-info">
                      <span className="label-name">{label.name}</span>
                    </div>
                    {isExplaining && selectedLabel?.id === label.id && (
                      <div className="explaining-indicator">
                        <div className="pulse-dot"></div>
                        <span>Explaining...</span>
                      </div>
                    )}
                  </button>
                ))}

                {/* Show More Button */}
                {hasMoreLabels && (
                  <button
                    className="show-more-btn"
                    onClick={toggleShowAllLabels}
                  >
                    <span className="more-icon">
                      {showAllLabels ? "−" : "+"}
                    </span>
                    <span>
                      {showAllLabels
                        ? "Show Less"
                        : `Show ${labels.length - 5} More`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Transcript */}
            <div className="transcript-section">
              <h3>🎤 Interactive Explanation Transcript</h3>
              <div className="transcript-content">
                {interactiveTranscript.length > 0 ? (
                  interactiveTranscript.map((entry, index) => (
                    <div key={index} className="transcript-entry">
                      <div className="transcript-time">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="transcript-text">
                        <strong>{entry.section}:</strong> {entry.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="transcript-placeholder">
                    <span className="placeholder-icon">🎧</span>
                    <p>Click on any label to hear its explanation!</p>
                    <p>
                      The explanation will appear here with live transcript.
                    </p>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="interactive-instructions">
          <div className="instruction-item">
            <span className="instruction-icon">👆</span>
            <span>Click on any label to hear its explanation</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🎧</span>
            <span>Listen to the AI voice explanation</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">📝</span>
            <span>Follow along with the live transcript</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDiagram;
