import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxes, FaArrowLeft } from "react-icons/fa";

const Materials = () => {
  const navigate = useNavigate();
  return (
    <div className="topic-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <div className="topic-header">
        <FaBoxes className="topic-icon" />
        <h2>Materials</h2>
        <p className="topic-desc">
          Select a level to start learning about materials in Chemistry!
        </p>
      </div>
      <div className="level-cards-flex">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i + 1} className="level-card">
            Level {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Materials;
