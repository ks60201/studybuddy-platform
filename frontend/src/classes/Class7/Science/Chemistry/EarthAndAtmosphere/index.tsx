import React from "react";
import { useNavigate } from "react-router-dom";
import { FaGlobe, FaArrowLeft } from "react-icons/fa";

const EarthAndAtmosphere = () => {
  const navigate = useNavigate();
  return (
    <div className="topic-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <div className="topic-header">
        <FaGlobe className="topic-icon" />
        <h2>Earth and Atmosphere</h2>
        <p className="topic-desc">
          Select a level to start learning about earth and atmosphere in
          Chemistry!
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

export default EarthAndAtmosphere;
