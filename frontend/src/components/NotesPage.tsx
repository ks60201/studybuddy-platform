import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotesManager from "../classes/Class7/Science/Physics/Waves/Level1/NotesManager";

const NotesPage: React.FC = () => {
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsNotesOpen(false);
    navigate(-1); // Go back to previous page
  };

  return (
    <div
      className="notes-page"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
    >
      <NotesManager
        isOpen={isNotesOpen}
        onClose={handleClose}
        API_BASE_URL={
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
        }
        API_ENDPOINT="/api/notes"
        standalone={true}
      />
    </div>
  );
};

export default NotesPage;
