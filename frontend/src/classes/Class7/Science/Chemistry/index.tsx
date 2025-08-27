import React from "react";
import { Link } from "react-router-dom";

const Chemistry = () => (
  <div className="page-container ai-teacher-list">
    <h2 className="ai-teacher-title">Class 7 - Science - Chemistry</h2>
    <p className="ai-teacher-subtitle">Select a topic to explore</p>
    <div className="class-list-grid">
      <Link
        to="/ai-teacher/class7/science/chemistry/particulate-nature-of-matter"
        className="class-card"
      >
        <span className="class-label">The Particulate Nature of Matter</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/atoms-elements-compounds"
        className="class-card"
      >
        <span className="class-label">Atoms, Elements and Compounds</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/pure-and-impure-substances"
        className="class-card"
      >
        <span className="class-label">Pure and Impure Substances</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/chemical-reactions"
        className="class-card"
      >
        <span className="class-label">Chemical Reactions</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/energetics"
        className="class-card"
      >
        <span className="class-label">Energetics</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/periodic-table"
        className="class-card"
      >
        <span className="class-label">The Periodic Table</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/materials"
        className="class-card"
      >
        <span className="class-label">Materials</span>
      </Link>
      <Link
        to="/ai-teacher/class7/science/chemistry/earth-and-atmosphere"
        className="class-card"
      >
        <span className="class-label">Earth and Atmosphere</span>
      </Link>
    </div>
  </div>
);

export default Chemistry;
