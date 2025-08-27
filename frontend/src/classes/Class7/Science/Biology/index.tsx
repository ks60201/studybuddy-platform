import React from "react";
import { Link } from "react-router-dom";

const Biology = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Science - Biology</h2>
    <p className="ai-teacher-subtitle">Select a topic to explore</p>
    <div className="class-list-grid">
      <Link
        to="/ai-teacher/class7/science/biology/structure-and-function"
        className="class-card"
      >
        <span className="class-label">
          Structure and Function of Living Organisms
        </span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/biology/material-cycles-and-energy"
        className="class-card"
      >
        <span className="class-label">Material Cycles and Energy</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/biology/interactions-and-interdependencies"
        className="class-card"
      >
        <span className="class-label">Interactions and Interdependencies</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/biology/genetics-and-evolution"
        className="class-card"
      >
        <span className="class-label">Genetics and Evolution</span>
      </Link>
    </div>
  </div>
);

export default Biology;
