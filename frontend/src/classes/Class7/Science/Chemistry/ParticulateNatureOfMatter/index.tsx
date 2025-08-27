import React from "react";
import { useNavigate } from "react-router-dom";
import { FaAtom, FaArrowLeft } from "react-icons/fa";

const ParticulateNatureOfMatter = () => {
  const navigate = useNavigate();
  return (
    <div className="topic-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <div className="topic-header">
        <FaAtom className="topic-icon" />
        <h2>The Particulate Nature of Matter</h2>
        <p className="topic-desc">
          Select a level to start learning about the particulate nature of
          matter in Chemistry!
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

export default ParticulateNatureOfMatter;
