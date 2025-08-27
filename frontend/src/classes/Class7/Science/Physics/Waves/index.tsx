import React from "react";
import { useNavigate } from "react-router-dom";
import { FaWater, FaArrowLeft } from "react-icons/fa";

const Waves = () => {
  const navigate = useNavigate();
  return (
    <div className="topic-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <div className="topic-header">
        <FaWater className="topic-icon" />
        <h2>Waves</h2>
        <p className="topic-desc">
          Select a level to start learning about Waves in Physics!
        </p>
      </div>
      <div className="level-cards-flex">
        <div
          className="level-card level-card-active"
          onClick={() =>
            navigate("/ai-teacher/class7/science/physics/waves/level1")
          }
          style={{ cursor: "pointer" }}
        >
          <h3>Level 1</h3>
          <p>Interactive Physics Lecture with TTS & Q&A</p>
          <span className="level-badge">🎓 Available</span>
        </div>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i + 2} className="level-card">
            Level {i + 2}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Waves;
