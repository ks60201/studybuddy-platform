import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCubes, FaArrowLeft } from "react-icons/fa";

const AtomsElementsCompounds = () => {
  const navigate = useNavigate();
  return (
    <div className="topic-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <div className="topic-header">
        <FaCubes className="topic-icon" />
        <h2>Atoms, Elements and Compounds</h2>
        <p className="topic-desc">
          Select a level to start learning about atoms, elements and compounds
          in Chemistry!
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

export default AtomsElementsCompounds;
