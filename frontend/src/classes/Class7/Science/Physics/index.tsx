import React from "react";
import { Link } from "react-router-dom";

const Physics = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Science - Physics</h2>
    <p className="ai-teacher-subtitle">Select a topic to explore</p>
    <div className="class-list-grid">
      <Link
        to="/ai-teacher/class7/science/physics/energy"
        className="class-card"
      >
        <span className="class-label">Energy</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/physics/motion-and-forces"
        className="class-card"
      >
        <span className="class-label">Motion and Forces</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/physics/waves"
        className="class-card"
      >
        <span className="class-label">Waves</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/physics/electricity-and-electromagnetism"
        className="class-card"
      >
        <span className="class-label">Electricity and Electromagnetism</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/physics/matter"
        className="class-card"
      >
        <span className="class-label">Matter</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/physics/space-physics"
        className="class-card"
      >
        <span className="class-label">Space Physics</span>
      </Link>
    </div>
  </div>
);

export default Physics;
