import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./NotesPopup.css";

interface Note {
  id: string;
  content: string;
  timestamp: string;
  section: string;
  section_index: number;
  updated_at?: string;
}

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  API_BASE_URL: string;
  API_ENDPOINT: string;
}

const NotesPopup: React.FC<NotesPopupProps> = ({
  isOpen,
  onClose,
  onPause,
  onResume,
  API_BASE_URL,
  API_ENDPOINT,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<string>("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Auto-resize textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Handle opening notes popup
  useEffect(() => {
    if (isOpen) {
      console.log("📝 Notes popup opened, pausing lecture...");
      handlePauseForNotes();
      fetchNotes();
    }
  }, [isOpen]);

  // Handle closing notes popup
  const handleClose = async () => {
    if (isPaused) {
      console.log("📝 Notes popup closing, resuming lecture...");
      await handleResumeFromNotes();
    }
    onClose();
  };

  // Pause lecture for note-taking (using existing pause functionality)
  const handlePauseForNotes = async () => {
    try {
      console.log("⏸️ Pausing lecture using existing pause function...");
      await onPause(); // Use the existing pauseLecture function
      setIsPaused(true);
      console.log("✅ Successfully paused lecture for notes");
    } catch (error) {
      console.error("❌ Error pausing lecture for notes:", error);
      setError("Failed to pause lecture for notes");
    }
  };

  // Resume lecture from notes (using existing resume functionality)
  const handleResumeFromNotes = async () => {
    try {
      console.log("▶️ Resuming lecture using existing resume function...");
      await onResume(); // Use the existing resumeLecture function
      setIsPaused(false);
      console.log("✅ Successfully resumed lecture from notes");
    } catch (error) {
      console.error("❌ Error resuming lecture from notes:", error);
      setError("Failed to resume lecture from notes");
    }
  };

  // Fetch all notes - using localStorage for now (can be enhanced with backend later)
  const fetchNotes = async () => {
    try {
      // For now, use localStorage to store notes
      // This can be enhanced to use the backend API later
      const savedNotes = localStorage.getItem("lecture_notes");
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError("Failed to load notes");
    }
  };

  // Add new note - using localStorage for now
  const handleAddNote = async () => {
    if (!currentNote.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const newNote: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: currentNote.trim(),
        timestamp: new Date().toISOString(),
        section: "Current Section", // Can be enhanced to get actual section
        section_index: 0,
      };

      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));

      setCurrentNote("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error adding note:", error);
      setError("Failed to add note");
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing note - using localStorage for now
  const handleUpdateNote = async (noteId: string, newContent: string) => {
    if (!newContent.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedNotes = notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              content: newContent.trim(),
              updated_at: new Date().toISOString(),
            }
          : note
      );

      setNotes(updatedNotes);
      localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
      setEditingNoteId(null);
      setEditingContent("");
    } catch (error) {
      console.error("Error updating note:", error);
      setError("Failed to update note");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedNotes = notes.filter((note) => note.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
    } catch (error) {
      console.error("Error deleting note:", error);
      setError("Failed to delete note");
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing a note
  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    // Auto-focus the edit textarea after state update
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        editTextareaRef.current.setSelectionRange(
          editTextareaRef.current.value.length,
          editTextareaRef.current.value.length
        );
      }
    }, 100);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (
    e: React.KeyboardEvent,
    action: string,
    data?: any
  ) => {
    if (e.key === "Escape") {
      if (action === "cancel_edit") {
        cancelEditing();
      } else if (action === "close") {
        handleClose();
      }
    } else if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        if (action === "add_note") {
          handleAddNote();
        } else if (action === "update_note") {
          handleUpdateNote(data.noteId, data.content);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="notes-popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="notes-popup"
          initial={{ opacity: 0, scale: 0.9, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="notes-header">
            <div className="notes-title">
              <span className="notes-icon">📝</span>
              <h3>Lecture Notes</h3>
              {isPaused && (
                <span className="pause-indicator">
                  <span className="pause-icon">⏸️</span>
                  Lecture Paused
                </span>
              )}
            </div>
            <button className="notes-close-btn" onClick={handleClose}>
              ✕
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              className="notes-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="error-icon">⚠️</span>
              {error}
              <button onClick={() => setError(null)} className="error-close">
                ✕
              </button>
            </motion.div>
          )}

          {/* New Note Input */}
          <div className="notes-input-section">
            <div className="input-header">
              <span className="input-label">✍️ Add New Note</span>
              <span className="input-shortcut">Ctrl+Enter to save</span>
            </div>
            <div className="notes-input-container">
              <textarea
                ref={textareaRef}
                value={currentNote}
                onChange={(e) => {
                  setCurrentNote(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={(e) => handleKeyDown(e, "add_note")}
                placeholder="Write your note here... (Ctrl+Enter to save, Esc to close)"
                className="notes-input"
                rows={3}
                disabled={isLoading}
              />
              <div className="notes-input-actions">
                <button
                  onClick={handleAddNote}
                  disabled={!currentNote.trim() || isLoading}
                  className="notes-save-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="save-icon">💾</span>
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Notes List */}
          <div className="notes-list-section">
            <div className="notes-list-header">
              <span className="list-title">📚 Your Notes ({notes.length})</span>
            </div>
            <div className="notes-list">
              {notes.length === 0 ? (
                <motion.div
                  className="notes-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="empty-icon">📝</span>
                  <p>
                    No notes yet. Start taking notes to capture key insights!
                  </p>
                </motion.div>
              ) : (
                notes
                  .slice()
                  .reverse()
                  .map((note, index) => (
                    <motion.div
                      key={note.id}
                      className="note-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="note-meta">
                        <span className="note-section">📍 {note.section}</span>
                        <span className="note-time">
                          {new Date(note.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {editingNoteId === note.id ? (
                        <div className="note-edit-container">
                          <textarea
                            ref={editTextareaRef}
                            value={editingContent}
                            onChange={(e) => {
                              setEditingContent(e.target.value);
                              autoResize(e.target);
                            }}
                            onKeyDown={(e) =>
                              handleKeyDown(e, "update_note", {
                                noteId: note.id,
                                content: editingContent,
                              })
                            }
                            className="note-edit-input"
                            rows={3}
                            disabled={isLoading}
                          />
                          <div className="note-edit-actions">
                            <button
                              onClick={() =>
                                handleUpdateNote(note.id, editingContent)
                              }
                              disabled={!editingContent.trim() || isLoading}
                              className="note-save-edit-btn"
                            >
                              <span className="save-icon">✅</span>
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="note-cancel-edit-btn"
                              disabled={isLoading}
                            >
                              <span className="cancel-icon">❌</span>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="note-content-container">
                          <div className="note-content">{note.content}</div>
                          <div className="note-actions">
                            <button
                              onClick={() => startEditing(note)}
                              className="note-edit-btn"
                              title="Edit note"
                            >
                              <span className="edit-icon">✏️</span>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="note-delete-btn"
                              title="Delete note"
                            >
                              <span className="delete-icon">🗑️</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="notes-footer">
            <div className="notes-stats">
              <span className="stat-item">
                <span className="stat-icon">📊</span>
                {notes.length} notes total
              </span>
            </div>
            <div className="notes-shortcuts">
              <span className="shortcut-item">Ctrl+Enter: Save</span>
              <span className="shortcut-item">Esc: Close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotesPopup;
