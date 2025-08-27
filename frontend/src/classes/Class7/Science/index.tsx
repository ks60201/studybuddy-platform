import React from "react";
import { Link } from "react-router-dom";

const Science = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Science</h2>
    <p className="ai-teacher-subtitle">Select a branch of science to explore</p>
    <div className="class-list-grid">
      <Link to="/ai-teacher/class7/science/biology" className="class-card">
        <span className="class-label">Biology</span>
      </Link>
      <Link to="/ai-teacher/class7/science/physics" className="class-card">
        <span className="class-label">Physics</span>
      </Link>
      <Link to="/ai-teacher/class7/science/chemistry" className="class-card">
        <span className="class-label">Chemistry</span>
      </Link>
    </div>
  </div>
);

export default Science;
