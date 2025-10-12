import React from "react";
import { Link } from "react-router-dom";

const Algebra = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Mathematics - Algebra</h2>
    <p className="ai-teacher-subtitle">Select a level to explore</p>
    <div className="class-list-grid">
      <Link
        to="/ai-teacher/class7/mathematics/algebra/level1"
        className="class-card"
      >
        <span className="class-label">Level 1</span>
      </Link>
      <Link
        to="/ai-teacher/class7/mathematics/algebra/level2"
        className="class-card"
      >
        <span className="class-label">Level 2</span>
      </Link>
      <Link
        to="/ai-teacher/class7/mathematics/algebra/level3"
        className="class-card"
      >
        <span className="class-label">Level 3</span>
      </Link>
    </div>
  </div>
);

export default Algebra;




