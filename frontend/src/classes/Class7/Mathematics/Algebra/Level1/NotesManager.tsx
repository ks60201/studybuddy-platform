import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "./RichTextEditor";
import "./NotesManager.css";

interface Note {
  id: string;
  content: string;
  lecture_type: string;
  lecture_section: string;
  note_timestamp: string;
  lecture_timestamp: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  // Legacy fields for backward compatibility
  title?: string;
  timestamp?: string;
  section?: string;
  section_index?: number;
  folder?: string;
  tags?: string[];
  isPinned?: boolean;
  color?: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  noteCount: number;
}

interface NotesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  API_BASE_URL: string;
  API_ENDPOINT: string;
  standalone?: boolean; // New prop to indicate standalone mode
}

const NotesManager: React.FC<NotesManagerProps> = ({
  isOpen,
  onClose,
  onPause,
  onResume,
  API_BASE_URL,
  API_ENDPOINT,
  standalone = false,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentNote, setCurrentNote] = useState<string>("");
  const [currentTitle, setCurrentTitle] = useState<string>("");
  // const [editingNoteId, setEditingNoteId] = useState<string | null>(null); // Removed for now
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "title" | "folder">("date");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3b82f6");
  const [newFolderIcon, setNewFolderIcon] = useState("📁");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Default folders
  const defaultFolders: Folder[] = [
    {
      id: "all",
      name: "All Notes",
      color: "#64748b",
      icon: "📝",
      noteCount: 0,
    },
    {
      id: "physics",
      name: "Physics",
      color: "#3b82f6",
      icon: "⚛️",
      noteCount: 0,
    },
    {
      id: "quick",
      name: "Quick Notes",
      color: "#10b981",
      icon: "⚡",
      noteCount: 0,
    },
    {
      id: "important",
      name: "Important",
      color: "#f59e0b",
      icon: "⭐",
      noteCount: 0,
    },
    {
      id: "review",
      name: "Review",
      color: "#8b5cf6",
      icon: "🔄",
      noteCount: 0,
    },
  ];

  // Note colors
  const noteColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  // Folder icons
  const folderIcons = [
    "📁",
    "📂",
    "📚",
    "📖",
    "📝",
    "⚛️",
    "🧪",
    "🔬",
    "📊",
    "💡",
    "⭐",
    "🎯",
    "🔥",
    "⚡",
    "🌟",
    "🎨",
    "🎵",
    "🎮",
    "🏆",
    "🔔",
  ];

  useEffect(() => {
    if (isOpen) {
      if (!standalone && onPause) {
        handlePauseForNotes();
      }
      fetchNotes();
      fetchFolders();
    }
  }, [isOpen, standalone]);

  // Calculate note counts for folders
  useEffect(() => {
    const updatedFolders = folders.map((folder) => ({
      ...folder,
      noteCount:
        folder.id === "all"
          ? notes.length
          : notes.filter((note) => note.folder === folder.id).length,
    }));
    setFolders(updatedFolders);
  }, [notes]);

  const handleClose = async () => {
    if (!standalone && isPaused && onResume) {
      await handleResumeFromNotes();
    }
    onClose();
  };

  const handlePauseForNotes = async () => {
    if (!onPause) return;
    try {
      await onPause();
      setIsPaused(true);
    } catch (error) {
      console.error("Error pausing lecture:", error);
      setError("Failed to pause lecture");
    }
  };

  const handleResumeFromNotes = async () => {
    if (!onResume) return;
    try {
      await onResume();
      setIsPaused(false);
    } catch (error) {
      console.error("Error resuming lecture:", error);
      setError("Failed to resume lecture");
    }
  };

  const fetchNotes = async () => {
    try {
      setIsLoading(true);

      // Get auth token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to view your notes");
        return;
      }

      // Use different endpoint based on mode
      const endpoint = standalone
        ? `${API_BASE_URL}/api/notes` // Use general notes API for standalone
        : `${API_BASE_URL}${API_ENDPOINT}/notes`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to view your notes");
          return;
        }
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success" && result.data.notes) {
        // Convert API notes to component format
        const apiNotes = result.data.notes.map((note: any) => ({
          ...note,
          // Add legacy fields for compatibility
          title:
            note.content.substring(0, 50) +
            (note.content.length > 50 ? "..." : ""),
          timestamp: note.created_at,
          section: note.lecture_section || "General",
          section_index: 0,
          folder: note.lecture_section ? "physics" : "quick",
          tags: [],
          isPinned: false,
          color: noteColors[Math.floor(Math.random() * noteColors.length)],
        }));

        setNotes(apiNotes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError("Failed to load notes");

      // Fallback to localStorage for backward compatibility
      try {
        const savedNotes = localStorage.getItem("lecture_notes");
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          setNotes(parsedNotes);
        }
      } catch (localError) {
        console.error("Error loading local notes:", localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFolders = () => {
    try {
      const savedFolders = localStorage.getItem("note_folders");
      if (savedFolders) {
        const parsedFolders = JSON.parse(savedFolders);
        setFolders([...defaultFolders, ...parsedFolders]);
      } else {
        setFolders(defaultFolders);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders(defaultFolders);
    }
  };

  const handleAddNote = async () => {
    if (!currentNote.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to save notes");
        return;
      }

      // Prepare note content (combine title and content if title exists)
      const noteContent = currentTitle.trim()
        ? `${currentTitle.trim()}\n\n${currentNote.trim()}`
        : currentNote.trim();

      const addEndpoint = standalone
        ? `${API_BASE_URL}/api/notes/add`
        : `${API_BASE_URL}${API_ENDPOINT}/notes/add`;

      const requestBody = {
        content: noteContent,
        lecture_section: selectedFolder === "all" ? "" : selectedFolder,
        lecture_type: standalone ? "general" : "mathematics_algebra_level1",
      };

      console.log("📝 Adding note:", {
        endpoint: addEndpoint,
        body: requestBody,
        standalone,
      });

      const response = await fetch(addEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to save notes");
          return;
        }
        const errorText = await response.text();
        console.error("❌ Add note error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Failed to add note: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();

      if (result.status === "success") {
        // Refresh notes list
        await fetchNotes();
        setCurrentNote("");
        setCurrentTitle("");
      } else {
        throw new Error(result.message || "Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      setError("Failed to add note");

      // Fallback to localStorage
      try {
        const newNote: Note = {
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: currentNote.trim(),
          lecture_type: "mathematics_algebra_level1",
          lecture_section:
            selectedFolder === "all" ? "general" : selectedFolder,
          note_timestamp: new Date().toISOString(),
          lecture_timestamp: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: "local",
          title: currentTitle.trim() || "Untitled Note",
          timestamp: new Date().toISOString(),
          section: "Current Section",
          section_index: 0,
          folder: selectedFolder === "all" ? "quick" : selectedFolder,
          tags: [],
          isPinned: false,
          color: noteColors[Math.floor(Math.random() * noteColors.length)],
        };

        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
        setCurrentNote("");
        setCurrentTitle("");
      } catch (localError) {
        console.error("Error with local fallback:", localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Temporarily disabled - will be implemented later
  /*
  const handleUpdateNote = async (
    noteId: string,
    newTitle: string,
    newContent: string
  ) => {
    if (!newContent.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to update notes");
        return;
      }

      // Prepare note content (combine title and content if title exists)
      const noteContent = newTitle.trim() 
        ? `${newTitle.trim()}\n\n${newContent.trim()}`
        : newContent.trim();

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}/notes/update`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note_id: noteId,
          content: noteContent,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to update notes");
          return;
        }
        throw new Error(`Failed to update note: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        // Refresh notes list
        await fetchNotes();
        // setEditingNoteId(null); // Commented out for now
      } else {
        throw new Error(result.message || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
      setError("Failed to update note");
      
      // Fallback to localStorage
      try {
        const updatedNotes = notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                title: newTitle.trim() || "Untitled Note",
                content: newContent.trim(),
                updated_at: new Date().toISOString(),
              }
            : note
        );

        setNotes(updatedNotes);
        localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
        // setEditingNoteId(null); // Commented out for now
      } catch (localError) {
        console.error("Error with local fallback:", localError);
      }
    } finally {
      setIsLoading(false);
    }
  };
  */

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to delete notes");
        return;
      }

      const deleteEndpoint = standalone
        ? `${API_BASE_URL}/api/notes/delete`
        : `${API_BASE_URL}${API_ENDPOINT}/notes/delete`;

      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note_id: noteId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please log in to delete notes");
          return;
        }
        throw new Error(`Failed to delete note: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        // Refresh notes list
        await fetchNotes();
      } else {
        throw new Error(result.message || "Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setError("Failed to delete note");

      // Fallback to localStorage
      try {
        const updatedNotes = notes.filter((note) => note.id !== noteId);
        setNotes(updatedNotes);
        localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
      } catch (localError) {
        console.error("Error with local fallback:", localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinNote = (noteId: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    );
    setNotes(updatedNotes);
    localStorage.setItem("lecture_notes", JSON.stringify(updatedNotes));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      icon: newFolderIcon,
      noteCount: 0,
    };

    const customFolders = folders.filter(
      (f) => !defaultFolders.find((df) => df.id === f.id)
    );
    const updatedCustomFolders = [...customFolders, newFolder];

    setFolders([...defaultFolders, ...updatedCustomFolders]);
    localStorage.setItem("note_folders", JSON.stringify(updatedCustomFolders));

    setNewFolderName("");
    setNewFolderColor("#3b82f6");
    setNewFolderIcon("📁");
    setShowNewFolderModal(false);
  };

  // Filter and sort notes
  const filteredNotes = notes
    .filter((note) => {
      if (
        selectedFolder !== "all" &&
        (note.folder || note.lecture_section) !== selectedFolder
      )
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (note.title || "").toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          (note.tags || []).some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if ((a.isPinned || false) !== (b.isPinned || false))
        return b.isPinned || false ? 1 : -1;

      switch (sortBy) {
        case "title":
          return (a.title || a.content.substring(0, 50)).localeCompare(
            b.title || b.content.substring(0, 50)
          );
        case "folder":
          return (a.folder || a.lecture_section || "").localeCompare(
            b.folder || b.lecture_section || ""
          );
        case "date":
        default:
          return (
            new Date(b.created_at || b.timestamp || new Date()).getTime() -
            new Date(a.created_at || a.timestamp || new Date()).getTime()
          );
      }
    });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="notes-manager-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="notes-manager"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="notes-manager-header">
            <div className="header-left">
              <h2 className="notes-title">
                <span className="notes-icon">📚</span>
                {standalone ? "My Notes" : "Smart Notes"}
              </h2>
              {!standalone && isPaused && (
                <span className="pause-indicator">
                  <span className="pause-icon">⏸️</span>
                  Lecture Paused
                </span>
              )}
            </div>

            <div className="header-controls">
              <div className="view-controls">
                <button
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  ▦
                </button>
                <button
                  className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  ☰
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-select"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="folder">Sort by Folder</option>
              </select>

              <button className="notes-close-btn" onClick={handleClose}>
                ✕
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="notes-manager-content">
            {/* Sidebar */}
            <div className="notes-sidebar">
              {/* Search */}
              <div className="search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search notes..."
                  className="search-input"
                />
              </div>

              {/* Folders */}
              <div className="folders-section">
                <div className="section-header">
                  <span>📁 Folders</span>
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="add-folder-btn"
                    title="Add folder"
                  >
                    +
                  </button>
                </div>

                <div className="folders-list">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`folder-item ${
                        selectedFolder === folder.id ? "active" : ""
                      }`}
                    >
                      <span
                        className="folder-icon"
                        style={{ color: folder.color }}
                      >
                        {folder.icon}
                      </span>
                      <span className="folder-name">{folder.name}</span>
                      <span className="folder-count">{folder.noteCount}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <button className="quick-action-btn">
                  <span>📤</span>
                  Export Notes
                </button>
                <button className="quick-action-btn">
                  <span>📥</span>
                  Import Notes
                </button>
              </div>
            </div>

            {/* Main Area */}
            <div className="notes-main">
              {/* New Note Section */}
              <div className="new-note-section">
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  placeholder="Note title..."
                  className="note-title-input"
                />

                <RichTextEditor
                  value={currentNote}
                  onChange={setCurrentNote}
                  placeholder="Start writing your note... Use '/' for commands"
                  minHeight="150px"
                />

                <div className="new-note-actions">
                  <button
                    onClick={handleAddNote}
                    disabled={
                      (!currentNote.trim() && !currentTitle.trim()) || isLoading
                    }
                    className="save-note-btn"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner-small"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Save Note
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notes Grid/List */}
              <div className={`notes-container ${viewMode}`}>
                {filteredNotes.length === 0 ? (
                  <div className="notes-empty">
                    <span className="empty-icon">📝</span>
                    <h3>No notes found</h3>
                    <p>
                      {searchQuery
                        ? "Try adjusting your search or create a new note"
                        : "Start taking notes to capture key insights!"}
                    </p>
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      className={`note-card ${note.isPinned ? "pinned" : ""}`}
                      style={{ borderLeftColor: note.color }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      layout
                    >
                      <div className="note-card-header">
                        <h4 className="note-card-title">
                          {note.title ||
                            note.content.substring(0, 50) +
                              (note.content.length > 50 ? "..." : "")}
                        </h4>
                        <div className="note-actions">
                          <button
                            onClick={() => handlePinNote(note.id)}
                            className={`pin-btn ${
                              note.isPinned ? "pinned" : ""
                            }`}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            📌
                          </button>
                          {/* Temporarily disabled edit functionality
                          <button
                            onClick={() => setEditingNoteId(note.id)}
                            className="edit-btn"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          */}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="delete-btn"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="note-card-content">
                        <div
                          className="note-preview"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      </div>

                      <div className="note-card-footer">
                        <span className="note-folder">
                          {note.lecture_section ? "📚" : "📁"}
                          {note.lecture_section || note.folder || "General"}
                        </span>
                        <span className="note-timestamp">
                          {new Date(
                            note.created_at || note.timestamp || new Date()
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* New Folder Modal */}
          {showNewFolderModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Create New Folder</h3>
                  <button onClick={() => setShowNewFolderModal(false)}>
                    ✕
                  </button>
                </div>

                <div className="modal-content">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="folder-name-input"
                  />

                  <div className="folder-customization">
                    <div>
                      <label>Color:</label>
                      <div className="color-picker">
                        {noteColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewFolderColor(color)}
                            className={`color-option ${
                              newFolderColor === color ? "selected" : ""
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label>Icon:</label>
                      <div className="icon-picker">
                        {folderIcons.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => setNewFolderIcon(icon)}
                            className={`icon-option ${
                              newFolderIcon === icon ? "selected" : ""
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => setShowNewFolderModal(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button onClick={handleCreateFolder} className="create-btn">
                    Create Folder
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              className="error-notification"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <span className="error-icon">⚠️</span>
              {error}
              <button onClick={() => setError(null)} className="error-close">
                ✕
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotesManager;
