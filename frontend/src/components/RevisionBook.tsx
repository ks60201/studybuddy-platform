import React, { useState, useEffect, useRef, Fragment } from "react";
import {
  Book,
  Clock,
  GraduationCap,
  Search,
  Filter,
  Grid,
  List,
  Sparkles,
  Star,
  BookOpen,
  Brain,
  Target,
  Zap,
  Eye,
  Bookmark,
  Share2,
  Download,
  Play,
  Pause,
  Volume2,
  Lightbulb,
  TrendingUp,
  Award,
  Calendar,
  Users,
  BarChart3,
  Sparkle,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  BookmarkPlus,
  Star as StarIcon,
  Heart,
  MessageCircle,
  Share,
  Copy,
  ExternalLink,
  Download as DownloadIcon,
  Printer,
  BookOpen as BookOpenIcon,
  Headphones,
  Mic,
  Video,
  Camera,
  FileText,
  Image,
  Video as VideoIcon,
  Music,
  File,
  Folder,
  Tag,
  Hash,
  AtSign,
  Hash as HashIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  MapPin,
  Globe,
  Wifi,
  Battery,
  Signal,
  Wifi as WifiIcon,
  Battery as BatteryIcon,
  Signal as SignalIcon,
  Highlighter,
  Send,
} from "lucide-react";
import "./RevisionBook.css";

interface SavedLecture {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  topic: string;
  saved_at: string;
  transcript: {
    sections: string[];
    transcript: Array<{
      section: string;
      text: string;
      timestamp: string;
    }>;
  };
  qa_interactions: Array<{
    section: string;
    text: string;
    timestamp: string;
    type: string;
  }>;
  diagram_info?: {
    type: string;
    image_filename: string;
    image_path: string;
    section: string;
    message: string;
    image_base64?: string;
    image_size?: number;
    image_url?: string;
  };
}

interface LectureStats {
  totalTime: number;
  sectionsCompleted: number;
  questionsAsked: number;
  comprehensionScore: number;
  lastStudied: string;
  studyStreak: number;
  favoriteTopics: string[];
  learningPath: string[];
}

const RevisionBook: React.FC = () => {
  const [savedLectures, setSavedLectures] = useState<SavedLecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<SavedLecture | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [viewMode, setViewMode] = useState<
    "grid" | "list" | "masonry" | "carousel"
  >("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [pageTurnDirection, setPageTurnDirection] = useState<
    "left" | "right" | null
  >(null);
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingMode, setReadingMode] = useState<"normal" | "focus" | "night">(
    "normal"
  );
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [lectureStats, setLectureStats] = useState<Map<string, LectureStats>>(
    new Map()
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    "date" | "title" | "subject" | "progress"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    dateRange: { start: "", end: "" },
    topics: [] as string[],
    difficulty: "all",
    duration: "all",
  });
  const [isDeletingLecture, setIsDeletingLecture] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ask-about-this-page (AI doubt solver) states
  const [showAskModal, setShowAskModal] = useState(false);
  const [askInput, setAskInput] = useState("");
  const [askContext, setAskContext] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    fetchSavedLectures();
    initializeParticles();
  }, []);

  const initializeParticles = () => {
    // Create floating particles effect
    const container = containerRef.current;
    if (!container) return;

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement("div");
      particle.className = "floating-particle";
      particle.style.left = Math.random() * 100 + "%";
      particle.style.animationDelay = Math.random() * 20 + "s";
      particle.style.animationDuration = Math.random() * 10 + 10 + "s";
      container.appendChild(particle);
    }
  };

  const fetchSavedLectures = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Please log in to view saved lectures");
        return;
      }

      // Get user data first
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Authentication failed");
      }

      const userData = await userResponse.json();
      console.log("User Data:", userData);

      // Then fetch saved lectures with the user email
      const response = await fetch(
        `${API_BASE_URL}/api/lectures/class7/science/physics/waves/level1/saved-lectures/${userData.email}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch saved lectures");
      }

      const data = await response.json();
      console.log("Saved Lectures Data:", data);

      if (data.data && Array.isArray(data.data.lectures)) {
        console.log("Processing lectures:", data.data.lectures.length);
        data.data.lectures.forEach((lecture: any, index: number) => {
          console.log(`Lecture ${index + 1}:`, {
            id: lecture.id,
            title: lecture.title,
            hasDiagramInfo: !!lecture.diagram_info,
            diagramInfo: lecture.diagram_info,
          });
        });

        setSavedLectures(data.data.lectures);
        if (data.data.lectures.length > 0) {
          setCurrentLecture(data.data.lectures[0]);
          generateLectureStats(data.data.lectures);
        }
      } else {
        console.error("Invalid data format:", data);
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Error fetching lectures:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generateLectureStats = (lectures: SavedLecture[]) => {
    const stats = new Map<string, LectureStats>();

    lectures.forEach((lecture) => {
      const totalTime = lecture.transcript.transcript.length * 2; // Estimate 2 min per section
      const sectionsCompleted = lecture.transcript.sections.length;
      const questionsAsked = lecture.qa_interactions.length;
      const comprehensionScore = Math.min(
        100,
        Math.max(60, 80 + questionsAsked * 2)
      );
      const studyStreak = Math.floor(Math.random() * 7) + 1;
      const favoriteTopics = lecture.transcript.sections.slice(0, 3);
      const learningPath = [
        "Introduction",
        "Core Concepts",
        "Advanced Topics",
        "Practice",
        "Review",
      ];

      stats.set(lecture.id, {
        totalTime,
        sectionsCompleted,
        questionsAsked,
        comprehensionScore,
        lastStudied: lecture.saved_at,
        studyStreak,
        favoriteTopics,
        learningPath,
      });
    });

    setLectureStats(stats);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openBook = (lecture: SavedLecture) => {
    setCurrentLecture(lecture);
    setCurrentPage(0);
    setPageTurnDirection(null);
    setIsBookOpen(true);
    setSelectedLecture(lecture.id);
  };

  const closeBook = () => {
    setIsBookOpen(false);
    setCurrentPage(0);
    setPageTurnDirection(null);
    setSelectedLecture(null);
  };

  const nextPage = () => {
    if (currentLecture && currentPage < getTotalPages() - 1) {
      setPageTurnDirection("right");
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setPageTurnDirection(null);
      }, 300);
    }
  };

  const previousPage = () => {
    if (currentPage > 0) {
      setPageTurnDirection("left");
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setPageTurnDirection(null);
      }, 300);
    }
  };

  const getTotalPages = () => {
    if (!currentLecture) return 0;
    const basePages = currentLecture.transcript.sections.length + 2; // +2 for cover and qa
    // Add 1 more page if diagram exists
    return currentLecture.diagram_info ? basePages + 4 : basePages;
  };

  // Setup voice recognition when ask modal opens
  useEffect(() => {
    if (showAskModal) {
      const hasSR =
        typeof window !== "undefined" &&
        ((window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition);
      if (hasSR) {
        setIsVoiceSupported(true);
        const SR =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        const recog = new SR();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = "en-US";
        recog.onstart = () => setIsListening(true);
        recog.onend = () => setIsListening(false);
        recog.onresult = (event: any) => {
          try {
            const transcript = event.results[0][0].transcript;
            setAskInput(transcript);
          } catch (e) {
            // ignore
          }
        };
        recognitionRef.current = recog;
      } else {
        setIsVoiceSupported(false);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setIsListening(false);
    }
  }, [showAskModal]);

  const startVoiceRecognition = () => {
    if (recognitionRef.current && !isListening && !askLoading) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // ignore start errors
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore stop errors
      }
    }
  };

  const openAskModalForSection = (title: string, text: string) => {
    setAskContext({ title, text });
    setAskInput("");
    setAskAnswer(null);
    setAskError(null);
    setShowAskModal(true);
  };

  const submitAskQuestion = async () => {
    if (!askContext) return;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setAskError("Please log in to ask a question");
      return;
    }

    const subjectRaw = currentLecture?.subject?.toLowerCase() || "general";
    const allowedSubjects = [
      "math",
      "science",
      "english",
      "history",
      "geography",
      "physics",
      "chemistry",
      "biology",
      "computer_science",
      "general",
    ];
    const subject = allowedSubjects.includes(subjectRaw)
      ? subjectRaw
      : "general";

    const questionText = (askInput || "Explain this page simply.").trim();
    const baseInstruction =
      "Answer in 4-5 short lines for a class 7 student. Keep it simple and friendly.";
    const sanitizedContext = (askContext.text || "")
      .replace(/\s+/g, " ")
      .trim();
    // Leave room for instruction + question; cap context to ~600 chars
    const contextSnippet = sanitizedContext.slice(0, 600);
    let composed = `${baseInstruction}\n\nUse this page context (title: "${askContext.title}"):\n${contextSnippet}\n\nStudent question: ${questionText}`;
    if (composed.length > 950) {
      composed = composed.slice(0, 950);
    }

    try {
      setAskLoading(true);
      setAskError(null);

      const formData = new FormData();
      formData.append("question", composed);
      formData.append("subject", subject);
      formData.append("style", "conversational");

      const response = await fetch(`${API_BASE_URL}/ai-doubt-solver/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let detail = "Failed to get answer";
        try {
          const err = await response.json();
          detail = err.detail || err.message || detail;
        } catch {}
        throw new Error(detail);
      }

      const data = await response.json();
      let answer: string = data?.answer || "";
      // As a safety net, trim to ~5 lines if model returns too long
      const lines = answer
        .split(/\r?\n/)
        .filter((l: string) => l.trim() !== "");
      if (lines.length > 5) {
        answer = lines.slice(0, 5).join("\n");
      }
      setAskAnswer(answer || "No response received.");
    } catch (e: any) {
      setAskError(e?.message || "Something went wrong");
    } finally {
      setAskLoading(false);
    }
  };

  const toggleBookmark = (lectureId: string) => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(lectureId)) {
      newBookmarks.delete(lectureId);
    } else {
      newBookmarks.add(lectureId);
    }
    setBookmarks(newBookmarks);
  };

  const deleteLecture = async (lectureId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this lecture? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeletingLecture(true);
    setDeleteError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setDeleteError("Please log in to delete the lecture");
        return;
      }

      // First verify the token is valid
      const authResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!authResponse.ok) {
        setDeleteError("Authentication failed. Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/lectures/class7/science/physics/waves/level1/saved-lecture/${lectureId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setDeleteError(errorData.detail || `Server error: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === "success") {
        // Remove the lecture from the local state
        setSavedLectures((prev) =>
          prev.filter((lecture) => lecture.id !== lectureId)
        );
        // Remove from bookmarks if bookmarked
        const newBookmarks = new Set(bookmarks);
        newBookmarks.delete(lectureId);
        setBookmarks(newBookmarks);
        // Close book if it's the current lecture
        if (currentLecture?.id === lectureId) {
          closeBook();
        }
      } else {
        setDeleteError(data.message || "Failed to delete lecture");
      }
    } catch (error) {
      console.error("Error deleting lecture:", error);
      setDeleteError("Failed to connect to server while deleting lecture");
    } finally {
      setIsDeletingLecture(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const changeReadingMode = (mode: "normal" | "focus" | "night") => {
    setReadingMode(mode);
  };

  const filteredAndSortedLectures = savedLectures
    .filter((lecture) => {
      const matchesSearch =
        lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecture.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecture.topic.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterSubject === "all" ||
        lecture.subject.toLowerCase() === filterSubject.toLowerCase();
      const matchesBookmark = !showBookmarks || bookmarks.has(lecture.id);
      return matchesSearch && matchesFilter && matchesBookmark;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison =
            new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "subject":
          comparison = a.subject.localeCompare(b.subject);
          break;
        case "progress":
          const statsA = lectureStats.get(a.id);
          const statsB = lectureStats.get(b.id);
          comparison =
            (statsB?.comprehensionScore || 0) -
            (statsA?.comprehensionScore || 0);
          break;
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });

  const uniqueSubjects = [
    ...new Set(savedLectures.map((lecture) => lecture.subject)),
  ];

  const renderBookContent = () => {
    if (!currentLecture) return null;

    const pages = [
      // Enhanced Cover page
      <div
        key="cover"
        className={`book-page cover-page ${
          pageTurnDirection ? `page-turn-${pageTurnDirection}` : ""
        }`}
      >
        <div className="cover-content">
          <div className="cover-spine"></div>
          <div className="cover-main">
            <div className="cover-glow"></div>
            <h1 className="cover-title">{currentLecture.title}</h1>
            <div className="cover-subtitle">{currentLecture.topic}</div>
            <div className="cover-details">
              <p>
                <GraduationCap size={20} /> {currentLecture.class_level}
              </p>
              <p>
                <Book size={20} /> {currentLecture.subject}
              </p>
              <p>
                <Clock size={20} /> {formatDate(currentLecture.saved_at)}
              </p>
            </div>
            <div className="cover-stats">
              <div className="stat-item">
                <Target size={16} />
                <span>
                  {lectureStats.get(currentLecture.id)?.comprehensionScore || 0}
                  % Mastery
                </span>
              </div>
              <div className="stat-item">
                <Brain size={16} />
                <span>
                  {lectureStats.get(currentLecture.id)?.sectionsCompleted || 0}{" "}
                  Sections
                </span>
              </div>
              <div className="stat-item">
                <MessageCircle size={16} />
                <span>
                  {lectureStats.get(currentLecture.id)?.questionsAsked || 0}{" "}
                  Q&As
                </span>
              </div>
            </div>
            <div className="cover-decoration">
              <Sparkles size={24} />
              <Star size={20} />
              <Sparkles size={24} />
            </div>
          </div>
        </div>
      </div>,

      // Enhanced Content pages
      ...currentLecture.transcript.transcript.map((section, idx) => (
        <div
          key={`content-${idx}`}
          className={`book-page content-page ${
            pageTurnDirection ? `page-turn-${pageTurnDirection}` : ""
          }`}
        >
          <div className="page-header">
            <h2>{section.section}</h2>
            <div className="page-number">{idx + 1}</div>
            <div className="page-actions">
              <button
                className="action-btn"
                title="Ask about this page"
                onClick={() =>
                  openAskModalForSection(section.section, section.text)
                }
              >
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
          <div
            className="content-text"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
          >
            {section.text}
          </div>

          {/* Remove diagram display from content pages - only show on dedicated page */}
        </div>
      )),

      // Enhanced Q&A page
      <div
        key="qa"
        className={`book-page qa-page ${
          pageTurnDirection ? `page-turn-${pageTurnDirection}` : ""
        }`}
      >
        <div className="page-header">
          <h2>Q&A Interactions</h2>
          <div className="page-number">
            {currentLecture.transcript.sections.length + 1}
          </div>
        </div>
        <div className="qa-content">
          {currentLecture.qa_interactions.map((qa, idx) => (
            <div key={idx} className="qa-item">
              <div className="qa-question">
                <div className="qa-icon">
                  <MessageCircle size={16} />
                </div>
                <div className="qa-content">
                  <strong>Q:</strong> {qa.text}
                </div>
              </div>
              {qa.type === "qa" && qa.text.includes("Answer:") && (
                <div className="qa-answer">
                  <div className="qa-icon">
                    <Lightbulb size={16} />
                  </div>
                  <div className="qa-content">
                    <strong>A:</strong> {qa.text.replace("Answer:", "").trim()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
    ];

    // Add diagram page if it exists (using push method for better control)
    if (currentLecture.diagram_info) {
      pages.push(
        <div
          key="diagram"
          className={`book-page diagram-page ${
            pageTurnDirection ? `page-turn-${pageTurnDirection}` : ""
          }`}
        >
          <div className="page-header">
            <h2>Visual Aids & Diagrams</h2>
            <div className="page-number">
              {currentLecture.transcript.sections.length + 2}
            </div>
            {currentLecture.diagram_info?.message && (
              <div className="page-actions">
                <button
                  className="action-btn"
                  title="Ask about this page"
                  onClick={() =>
                    openAskModalForSection(
                      "Visual Aids & Diagrams",
                      currentLecture.diagram_info?.message || ""
                    )
                  }
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="diagram-container">
            <div className="diagram-header">
              <Image size={20} />
              <span>Visual Aid</span>
            </div>
            <div className="diagram-content">
              {(() => {
                // Check if base64 is actually a string (not just true)
                const hasValidBase64 =
                  currentLecture.diagram_info?.image_base64 &&
                  typeof currentLecture.diagram_info.image_base64 ===
                    "string" &&
                  currentLecture.diagram_info.image_base64.length > 100;

                const imageSrc = hasValidBase64
                  ? `data:image/png;base64,${currentLecture.diagram_info.image_base64}`
                  : currentLecture.diagram_info?.image_url
                  ? `http://localhost:8000${currentLecture.diagram_info.image_url}`
                  : currentLecture.diagram_info?.image_filename
                  ? `http://localhost:8000/api/lectures/class7/science/physics/waves/level1/diagram-image/${currentLecture.diagram_info.image_filename}`
                  : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwTDE1MCAxMDBMMjAwIDUwTDI1MCAxMDBMMjAwIDE1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";

                return (
                  <img
                    src={imageSrc}
                    alt={currentLecture.diagram_info?.message || "Diagram"}
                    className="diagram-image"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                    onError={(e) => {
                      // Show placeholder when image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const placeholder = target.parentElement?.querySelector(
                        ".diagram-placeholder"
                      );
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = "block";
                      }
                    }}
                    onLoad={() => {
                      // Hide placeholder when image loads successfully
                      const placeholder = document.querySelector(
                        ".diagram-placeholder"
                      );
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = "none";
                      }
                    }}
                  />
                );
              })()}
              <div
                className="diagram-placeholder"
                style={{
                  display: "none",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🖼️</div>
                <h4>Diagram Image</h4>
                <p>Image could not be loaded</p>
                <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  The diagram explanation is still available below
                </p>
              </div>
              <div className="diagram-caption">
                <h3>Diagram Explanation</h3>
                <p>{currentLecture.diagram_info.message}</p>
              </div>
            </div>
          </div>
          <div className="page-footer">
            <span>Visual Aid - {currentLecture.title}</span>
            <div className="page-actions">
              <button className="action-btn" title="Bookmark">
                <Bookmark size={16} />
              </button>
              <button className="action-btn" title="Share">
                <Share2 size={16} />
              </button>
              <button className="action-btn" title="Highlight">
                <Highlighter size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return pages[currentPage] || null;
  };

  if (loading) {
    return (
      <div className="library-container" ref={containerRef}>
        <div className="loading-spinner">
          <div className="spinner-glow"></div>
          <div className="spinner"></div>
          <p>Loading your extraordinary library...</p>
          <div className="loading-particles">
            <Sparkles size={24} />
            <Star size={20} />
            <Sparkles size={24} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="library-container" ref={containerRef}>
        <div className="error-message">
          <div className="error-icon">
            <X size={48} />
          </div>
          <p>{error}</p>
          <button onClick={fetchSavedLectures} className="retry-btn">
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isBookOpen && currentLecture) {
    return (
      <div className={`book-viewer ${isFullscreen ? "fullscreen" : ""}`}>
        <div className="book-viewer-header">
          <button onClick={closeBook} className="close-book-btn">
            <ChevronLeft size={20} />
            Back to Library
          </button>
          <div className="book-info">
            <h3>{currentLecture.title}</h3>
            <span>
              Page {currentPage + 1} of {getTotalPages()}
            </span>
          </div>
          <div className="book-controls">
            <button onClick={toggleFullscreen} className="control-btn">
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <select
              value={readingMode}
              onChange={(e) => changeReadingMode(e.target.value as any)}
              className="reading-mode-select"
            >
              <option value="normal">Normal</option>
              <option value="focus">Focus</option>
              <option value="night">Night</option>
            </select>
            <div className="font-controls">
              <button onClick={() => setFontSize(Math.max(12, fontSize - 2))}>
                A-
              </button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize(Math.min(24, fontSize + 2))}>
                A+
              </button>
            </div>
          </div>
        </div>

        <div className="book-container" ref={bookRef}>
          <div className="book-pages">{renderBookContent()}</div>
          <div className="book-navigation">
            <button
              onClick={previousPage}
              disabled={currentPage === 0}
              className="nav-btn prev-btn"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <div className="page-indicator">
              <span>{currentPage + 1}</span>
              <div className="page-dots">
                {Array.from({ length: getTotalPages() }, (_, i) => (
                  <div
                    key={i}
                    className={`page-dot ${i === currentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(i)}
                  ></div>
                ))}
              </div>
              <span>{getTotalPages()}</span>
            </div>
            <button
              onClick={nextPage}
              disabled={currentPage === getTotalPages() - 1}
              className="nav-btn next-btn"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Ask Modal */}
        {showAskModal && (
          <div className="ask-modal-overlay">
            <div className="ask-modal">
              <div className="ask-modal-header">
                <h3>Ask about this page</h3>
                <button
                  className="ask-close"
                  onClick={() => setShowAskModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {askContext && (
                <div className="ask-context">
                  <div className="ask-context-title">{askContext.title}</div>
                  <div className="ask-context-text">
                    {askContext.text.length > 400
                      ? askContext.text.slice(0, 400) + "..."
                      : askContext.text}
                  </div>
                </div>
              )}
              <div className="ask-input-row">
                <input
                  type="text"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder={
                    isVoiceSupported
                      ? "Type or tap mic to speak your question"
                      : "Type your question (e.g., Explain simply, give an example)"
                  }
                  disabled={askLoading}
                />
                {isVoiceSupported && (
                  <button
                    className={`ask-mic ${isListening ? "listening" : ""}`}
                    onClick={
                      isListening ? stopVoiceRecognition : startVoiceRecognition
                    }
                    title={isListening ? "Stop listening" : "Speak"}
                    disabled={askLoading}
                  >
                    {isListening ? "🎙️" : "🎤"}
                  </button>
                )}
                <button
                  className="ask-send"
                  onClick={submitAskQuestion}
                  disabled={askLoading}
                  title="Send"
                >
                  {askLoading ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              {askError && <div className="ask-error">{askError}</div>}
              {askAnswer && (
                <div className="ask-answer">
                  {askAnswer.split(/\r?\n/).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="library-container" ref={containerRef}>
      <div className="library-header">
        <div className="library-title">
          <div className="title-icon">
            <Book size={32} />
            <Sparkles size={20} className="sparkle-1" />
            <Star size={16} className="sparkle-2" />
          </div>
          <h1>My Learning Library</h1>
          <div className="library-stats">
            <span>{savedLectures.length} Lectures</span>
            <span>{Array.from(bookmarks).length} Bookmarked</span>
          </div>
        </div>
        <div className="library-controls">
          <div className="search-filter">
            <div className="search-box">
              <Search size={20} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search lectures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="advanced-search-btn"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Filter size={16} />
              </button>
            </div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="subject">Subject</option>
              <option value="progress">Progress</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
          <div className="view-toggle">
            <button
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "active" : ""}
              title="Grid View"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "active" : ""}
              title="List View"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode("masonry")}
              className={viewMode === "masonry" ? "active" : ""}
              title="Masonry View"
            >
              <BookOpen size={20} />
            </button>
            <button
              onClick={() => setViewMode("carousel")}
              className={viewMode === "carousel" ? "active" : ""}
              title="Carousel View"
            >
              <BarChart3 size={20} />
            </button>
          </div>
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`bookmark-toggle ${showBookmarks ? "active" : ""}`}
            title="Show Bookmarks"
          >
            <Bookmark size={20} />
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="error-message">
          <div className="error-icon">
            <X size={20} />
          </div>
          <p>{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="retry-btn">
            <X size={16} />
            Dismiss
          </button>
        </div>
      )}

      {showAdvancedSearch && (
        <div className="advanced-search-panel">
          <div className="search-filters">
            <div className="filter-group">
              <label>Date Range</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={searchFilters.dateRange.start}
                  onChange={(e) =>
                    setSearchFilters({
                      ...searchFilters,
                      dateRange: {
                        ...searchFilters.dateRange,
                        start: e.target.value,
                      },
                    })
                  }
                />
                <span>to</span>
                <input
                  type="date"
                  value={searchFilters.dateRange.end}
                  onChange={(e) =>
                    setSearchFilters({
                      ...searchFilters,
                      dateRange: {
                        ...searchFilters.dateRange,
                        end: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="filter-group">
              <label>Difficulty</label>
              <select
                value={searchFilters.difficulty}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    difficulty: e.target.value,
                  })
                }
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Duration</label>
              <select
                value={searchFilters.duration}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    duration: e.target.value,
                  })
                }
              >
                <option value="all">Any Duration</option>
                <option value="short">Short (&lt; 15 min)</option>
                <option value="medium">Medium (15-30 min)</option>
                <option value="long">Long (&gt; 30 min)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="library-content">
        {filteredAndSortedLectures.length === 0 ? (
          <div className="empty-library">
            <div className="empty-icon">
              <Book size={64} />
              <Sparkles size={32} className="sparkle-1" />
              <Star size={24} className="sparkle-2" />
            </div>
            <h3>No lectures found</h3>
            <p>
              Complete a lecture to see it here in your extraordinary library
            </p>
            <div className="empty-actions">
              <button className="action-btn">
                <BookOpen size={16} />
                Start Learning
              </button>
              <button className="action-btn">
                <Sparkles size={16} />
                Explore Topics
              </button>
            </div>
          </div>
        ) : (
          <div className={`lectures-grid ${viewMode}`}>
            {filteredAndSortedLectures.map((lecture) => {
              const stats = lectureStats.get(lecture.id);
              const isBookmarked = bookmarks.has(lecture.id);
              const isHovered = hoveredCard === lecture.id;

              return (
                <div
                  key={lecture.id}
                  className={`lecture-card ${isHovered ? "hovered" : ""} ${
                    isBookmarked ? "bookmarked" : ""
                  }`}
                  onClick={() => openBook(lecture)}
                  onMouseEnter={() => setHoveredCard(lecture.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="card-spine"></div>
                  <div className="card-content">
                    <div className="card-header">
                      <h3>{lecture.title}</h3>
                      <div className="card-badges">
                        <span className="subject-badge">{lecture.subject}</span>
                        {isBookmarked && (
                          <Bookmark size={16} className="bookmark-icon" />
                        )}
                      </div>
                    </div>
                    <div className="card-details">
                      <p>
                        <GraduationCap size={16} /> {lecture.class_level}
                      </p>
                      <p>
                        <Clock size={16} /> {formatDate(lecture.saved_at)}
                      </p>
                      <p className="topic">{lecture.topic}</p>
                    </div>
                    {stats && (
                      <div className="card-stats">
                        <div className="stat-item">
                          <Target size={14} />
                          <span>{stats.comprehensionScore}% Mastery</span>
                        </div>
                        <div className="stat-item">
                          <Brain size={14} />
                          <span>{stats.sectionsCompleted} Sections</span>
                        </div>
                        <div className="stat-item">
                          <MessageCircle size={14} />
                          <span>{stats.questionsAsked} Q&As</span>
                        </div>
                        <div className="stat-item">
                          <TrendingUp size={14} />
                          <span>{stats.studyStreak} Day Streak</span>
                        </div>
                      </div>
                    )}
                    <div className="card-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(lecture.id);
                        }}
                        className={`action-btn ${isBookmarked ? "active" : ""}`}
                        title={
                          isBookmarked ? "Remove Bookmark" : "Add Bookmark"
                        }
                      >
                        <Bookmark size={16} />
                      </button>
                      <button className="action-btn" title="Share">
                        <Share2 size={16} />
                      </button>
                      <button className="action-btn" title="Download">
                        <Download size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLecture(lecture.id);
                        }}
                        className="action-btn delete-btn"
                        title="Delete Lecture"
                        disabled={isDeletingLecture}
                      >
                        {isDeletingLecture ? (
                          <div className="loading-spinner-small"></div>
                        ) : (
                          <X size={16} />
                        )}
                      </button>
                    </div>
                    <div className="card-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${stats?.comprehensionScore || 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {stats?.comprehensionScore || 0}% Complete
                      </span>
                    </div>
                  </div>
                  <div className="card-glow"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevisionBook;
