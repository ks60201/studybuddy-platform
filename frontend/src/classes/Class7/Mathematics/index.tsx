import React from "react";
import { Link } from "react-router-dom";

const Mathematics = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Mathematics</h2>
    <p className="ai-teacher-subtitle">
      Select a branch of mathematics to explore
    </p>
    <div className="class-list-grid">
      <Link to="/ai-teacher/class7/mathematics/algebra" className="class-card">
        <span className="class-label">Algebra</span>
      </Link>
      <Link to="/ai-teacher/class7/mathematics/geometry" className="class-card">
        <span className="class-label">Geometry</span>
      </Link>
      <Link
        to="/ai-teacher/class7/mathematics/arithmetic"
        className="class-card"
      >
        <span className="class-label">Arithmetic</span>
      </Link>
    </div>
  </div>
);

export default Mathematics;
