import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Send,
  Camera,
  Mic,
  MicOff,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  MessageCircle,
  Star,
  Settings,
  Volume2,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";

// Types
interface Message {
  role: "user" | "ai";
  text: string;
  timestamp: Date;
  imageUrl?: string;
  confidence_score?: number;
  suggested_followups?: string[];
  learning_resources?: string[];
  key_concepts?: string[];
  visual_aids_suggested?: boolean;
  isTyping?: boolean;
}

type SubjectType =
  | "math"
  | "science"
  | "english"
  | "history"
  | "geography"
  | "physics"
  | "chemistry"
  | "biology"
  | "computer_science"
  | "general";

type ResponseStyle =
  | "conversational"
  | "formal"
  | "story_based"
  | "analogy_rich"
  | "interactive";

const CLASS_LEVELS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Typing Animation Hook
const useTypingEffect = (text: string, speed: number = 30) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) return;

    setIsTyping(true);
    setDisplayedText("");

    let currentIndex = 0;

    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => {
      clearInterval(timer);
    };
  }, [text, speed]);

  return { displayedText, isTyping };
};

// Animated Text Component
const AnimatedText: React.FC<{
  text: string;
  delay?: number;
}> = ({ text, delay = 0 }) => {
  const { displayedText, isTyping } = useTypingEffect(text, 25);

  return (
    <div className="animated-text">
      {displayedText || text}
      {isTyping && <span className="typing-cursor">|</span>}
    </div>
  );
};

const AiDoubtSolverChatbox = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classLevel, setClassLevel] = useState<number | null>(null);
  const [showClassPrompt, setShowClassPrompt] = useState(true);
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectType>("general");
  const [selectedStyle, setSelectedStyle] =
    useState<ResponseStyle>("conversational");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async (retryCount = 0) => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // First, test if backend is reachable
      try {
        console.log("Testing backend connectivity...");
        const testResponse = await fetch(`${API_BASE_URL}/`);
        console.log("Backend test response:", testResponse.status);
      } catch (error) {
        console.error("Backend not reachable:", error);
      }

      try {
        console.log(
          `Checking authentication with token (attempt ${retryCount + 1}):`,
          token.substring(0, 20) + "..."
        );
        console.log("Making request to:", `${API_BASE_URL}/auth/me`);

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Auth response status:", response.status);
        console.log(
          "Auth response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (response.ok) {
          setIsAuthenticated(true);
          const userData = await response.json();
          console.log("User authenticated:", userData);
          // Add welcome message
          setMessages([
            {
              role: "ai",
              text: `Welcome back! I'm here to help you with your studies. What would you like to learn about today?`,
              timestamp: new Date(),
              isTyping: true,
            },
          ]);
        } else {
          console.error("Auth failed with status:", response.status);
          // Don't immediately remove token on network errors
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("auth_token");
            setIsAuthenticated(false);
          } else {
            // For other errors, keep the token and try to continue
            console.warn("Non-auth error, keeping token and continuing");
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Retry up to 2 times for network errors
        if (retryCount < 2) {
          console.log(
            `Retrying authentication in 1 second... (attempt ${retryCount + 1})`
          );
          setTimeout(() => checkAuth(retryCount + 1), 1000);
          return;
        }
        // Don't remove token on network errors, just log and continue
        console.warn(
          "Network error during auth check after retries, keeping token"
        );
        // Try to continue with existing token
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No token found, redirecting to login");
        navigate("/login");
      } else {
        console.log(
          "Token exists but auth failed, will retry on next interaction"
        );
      }
    }
  }, [isAuthenticated, navigate]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onstart = () => setIsRecording(true);
      recognitionInstance.onend = () => setIsRecording(false);
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSubmit(new Event("submit") as any, transcript);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Load saved class level
  useEffect(() => {
    const savedClass = localStorage.getItem("ai_doubt_solver_class");
    if (savedClass) {
      setClassLevel(parseInt(savedClass));
      setShowClassPrompt(false);
    }
  }, []);

  // Auto-scroll disabled - user has full control over scroll position
  // useEffect(() => {
  //   // Auto-scroll functionality removed
  // }, [messages, userHasScrolledUp, loading]);

  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const messagesContainer = document.querySelector(".messages-container");
    if (!messagesContainer) return;

    const handleScroll = () => {
      const scrollPosition = messagesContainer.scrollTop;
      const scrollHeight = messagesContainer.scrollHeight;
      const clientHeight = messagesContainer.clientHeight;
      const isAtBottom = scrollPosition + clientHeight >= scrollHeight - 50; // More lenient detection

      setShowScrollButton(!isAtBottom);
    };

    messagesContainer.addEventListener("scroll", handleScroll);
    return () => messagesContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClassSelect = (level: number) => {
    setClassLevel(level);
    localStorage.setItem("ai_doubt_solver_class", level.toString());
    setShowClassPrompt(false);

    // Add welcome message with typing effect
    setMessages([
      {
        role: "ai",
        text: `🎉 Welcome to your AI Study Buddy for Class ${level}! I'm here to help you learn and grow. Ask me anything - from homework questions to complex concepts. I can explain things in fun ways, provide examples, and even suggest follow-up questions to deepen your understanding. What would you like to explore today?`,
        timestamp: new Date(),
        isTyping: true,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent, transcriptText?: string) => {
    e.preventDefault();
    let questionText = transcriptText || input.trim();

    // If no text but image is provided, use a default question
    if (!questionText && image) {
      questionText = "Please analyze this image and explain what you see.";
    }

    if (!questionText && !image) return;
    if (!isAuthenticated) {
      // Try to re-authenticate before giving up
      const token = localStorage.getItem("auth_token");
      if (token) {
        console.log("Retrying authentication...");
        try {
          const authResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (authResponse.ok) {
            setIsAuthenticated(true);
            console.log("Re-authentication successful");
          } else {
            console.error("Re-authentication failed:", authResponse.status);
            localStorage.removeItem("auth_token");
            navigate("/login");
            return;
          }
        } catch (error) {
          console.error("Re-authentication error:", error);
          navigate("/login");
          return;
        }
      } else {
        navigate("/login");
        return;
      }
    }

    // Get auth token
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsAuthenticated(false);
      navigate("/login");
      return;
    }

    // Add user message
    const userMessage: Message = {
      role: "user",
      text: questionText,
      timestamp: new Date(),
      imageUrl: image ? URL.createObjectURL(image) : undefined,
    };

    setMessages((msgs) => [...msgs, userMessage]);
    setLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      role: "ai",
      text: "",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((msgs) => [...msgs, typingMessage]);

    try {
      const formData = new FormData();
      formData.append("question", questionText);
      formData.append("subject", selectedSubject);
      formData.append("style", selectedStyle);
      if (image) formData.append("image", image);

      // Debug: Log what we're sending
      console.log("Sending form data:", {
        question: questionText,
        subject: selectedSubject,
        style: selectedStyle,
        hasImage: !!image,
        imageSize: image?.size,
        imageType: image?.type,
      });

      const response = await fetch(`${API_BASE_URL}/ai-doubt-solver/ask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData - let browser set it automatically
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Please log in again to continue.");
        }

        // Try to get detailed error information
        let errorDetail = "Failed to get response";
        try {
          const errorData = await response.json();
          console.log("Error response:", errorData);
          console.log("Error detail array:", errorData.detail);
          if (Array.isArray(errorData.detail)) {
            errorDetail = errorData.detail
              .map((err: any) => `${err.loc?.join(".")}: ${err.msg}`)
              .join(", ");
          } else {
            errorDetail =
              errorData.detail ||
              errorData.message ||
              JSON.stringify(errorData);
          }
        } catch (parseError) {
          console.log("Could not parse error response");
        }

        throw new Error(errorDetail);
      }

      const res = await response.json();
      console.log("API Response:", res);

      // Generate AI follow-up questions
      let aiFollowups = res.suggested_followups || []; // Fallback to original followups
      try {
        const followupFormData = new FormData();
        followupFormData.append("question", questionText);
        followupFormData.append("answer", res.answer);
        followupFormData.append("subject", selectedSubject);
        followupFormData.append("class_level", classLevel?.toString() || "7"); // Default to class 7 if null

        const followupResponse = await fetch(
          `${API_BASE_URL}/ai-doubt-solver/generate-followups`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: followupFormData,
          }
        );

        if (followupResponse.ok) {
          const followupData = await followupResponse.json();
          aiFollowups = followupData.followups;
          console.log("AI Generated Follow-ups:", aiFollowups);
        }
      } catch (followupError) {
        console.error("Error generating follow-ups:", followupError);
        // Keep the original followups if AI generation fails
      }

      // Remove typing indicator and add real response
      setMessages((msgs) => {
        const withoutTyping = msgs.slice(0, -1);
        const newMessage = {
          role: "ai" as const,
          text: res.answer || "No response received",
          timestamp: new Date(),
          confidence_score: res.confidence_score,
          suggested_followups: aiFollowups,
          learning_resources: res.learning_resources || [],
          key_concepts: Array.isArray(res.key_concepts) ? res.key_concepts : [],
          visual_aids_suggested: res.visual_aids_suggested || false,
          isTyping: true,
        };
        return [...withoutTyping, newMessage];
      });

      setInput("");
      setImage(null);
      setShowImagePreview(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("API Error:", err);

      // Extract error message properly
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        // Handle object errors
        if ("detail" in err) {
          errorMessage = String(err.detail);
        } else if ("message" in err) {
          errorMessage = String(err.message);
        } else {
          errorMessage = String(err);
        }
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setMessages((msgs) => {
        const withoutTyping = msgs.slice(0, -1);
        return [
          ...withoutTyping,
          {
            role: "ai",
            text: `Sorry, there was an error. ${errorMessage}`,
            timestamp: new Date(),
            isTyping: true,
          },
        ];
      });

      // If unauthorized, clear token
      if (errorMessage.includes("log in")) {
        localStorage.removeItem("auth_token");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setShowImagePreview(true);
    }
  };

  const handleResetClass = () => {
    setClassLevel(null);
    localStorage.removeItem("ai_doubt_solver_class");
    setShowClassPrompt(true);
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  };

  const removeImage = () => {
    setImage(null);
    setShowImagePreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = () => {
    if (recognition && !isRecording && !loading) {
      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessageContent = (msg: Message, messageIndex: number) => {
    return (
      <div className="message-content">
        {msg.imageUrl && (
          <div className="message-image">
            <img src={msg.imageUrl} alt="Upload" />
          </div>
        )}
        <div className="message-bubble">
          {msg.role === "ai" && msg.text && msg.isTyping ? (
            <AnimatedText text={msg.text} />
          ) : (
            <p>{msg.text}</p>
          )}

          {/* Enhanced AI response features */}
          {msg.role === "ai" && msg.confidence_score && (
            <div className="confidence-indicator">
              <div className="confidence-header">
                <Star size={16} />
                <span className="confidence-label">🎯 Answer Quality</span>
              </div>
              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{ width: `${msg.confidence_score * 100}%` }}
                ></div>
              </div>
              <span className="confidence-text">
                {Math.round(msg.confidence_score * 100)}% Excellent
              </span>
            </div>
          )}

          {msg.role === "ai" &&
            msg.key_concepts &&
            msg.key_concepts.length > 0 && (
              <div className="key-concepts">
                <div className="concepts-header">
                  <Zap size={14} />
                  <span className="concepts-label">Key Concepts</span>
                </div>
                <div className="concepts-tags">
                  {msg.key_concepts.map((concept, idx) => (
                    <span key={idx} className="concept-tag">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {msg.role === "ai" &&
            msg.suggested_followups &&
            msg.suggested_followups.length > 0 && (
              <div className="followup-suggestions">
                <div className="followup-header">
                  <MessageCircle size={18} />
                  <span className="followup-label">
                    🚀 Continue Learning - Best Questions!
                  </span>
                </div>
                <div className="followup-list">
                  {msg.suggested_followups.map((followup, idx) => (
                    <button
                      key={idx}
                      className="followup-btn"
                      onClick={() => setInput(followup)}
                    >
                      <span className="followup-icon">💡</span>
                      <span className="followup-text">{followup}</span>
                      <span className="followup-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {msg.role === "ai" &&
            msg.learning_resources &&
            msg.learning_resources.length > 0 && (
              <div className="learning-resources">
                <div className="resources-header">
                  <Volume2 size={16} />
                  <span className="resources-label">📚 Learning Resources</span>
                </div>
                <ul className="resources-list">
                  {msg.learning_resources.map((resource, idx) => (
                    <li key={idx} className="resource-item">
                      <span className="resource-icon">✨</span>
                      {resource}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
        <div className="message-time">{formatTime(msg.timestamp)}</div>
      </div>
    );
  };

  return (
    <div className="ai-doubt-solver-container">
      {/* Premium Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="ai-avatar">
              <Brain size={24} />
              <div className="avatar-glow"></div>
            </div>
            <div className="header-info">
              <h1>JunoVeda</h1>
              <p>Your intelligent learning companion</p>
            </div>
          </div>

          <div className="header-actions">
            {classLevel && (
              <div className="class-badge">
                <button onClick={handleResetClass} className="change-class-btn">
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="settings-btn"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Class Selection Modal */}
      {showClassPrompt && (
        <div className="class-selection-overlay">
          <div className="class-selection-modal">
            <div className="modal-header">
              <div className="sparkle-container">
                <Sparkles size={32} className="sparkle-icon" />
                <div className="sparkle-effects">
                  <div className="sparkle sparkle-1"></div>
                  <div className="sparkle sparkle-2"></div>
                  <div className="sparkle sparkle-3"></div>
                </div>
              </div>
              <h2>Welcome to AI Study Buddy!</h2>
              <p>Select your class to unlock personalized learning</p>
            </div>
            <div className="class-grid">
              {CLASS_LEVELS.map((level) => (
                <button
                  key={level}
                  className="class-card"
                  onClick={() => handleClassSelect(level)}
                >
                  <div className="class-number">{level}</div>
                  <div className="class-label">Class</div>
                  <div className="card-glow"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !showClassPrompt && (
        <div className="settings-panel">
          <div className="setting-group">
            <label>Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(e.target.value as SubjectType)
              }
              className="subject-select"
            >
              {[
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
              ].map((subject) => (
                <option key={subject} value={subject}>
                  {subject.charAt(0).toUpperCase() +
                    subject.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-group">
            <label>Teaching Style:</label>
            <select
              value={selectedStyle}
              onChange={(e) =>
                setSelectedStyle(e.target.value as ResponseStyle)
              }
              className="style-select"
            >
              {[
                "conversational",
                "formal",
                "story_based",
                "analogy_rich",
                "interactive",
              ].map((style) => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() +
                    style.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {!showClassPrompt && (
        <div className="chat-interface">
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {renderMessageContent(msg, index)}
              </div>
            ))}
            {loading && (
              <div className="message ai">
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                className="scroll-to-bottom-btn"
                onClick={scrollToBottom}
                title="Scroll to bottom"
              >
                <ChevronDown size={20} />
              </button>
            )}
          </div>

          {/* Enhanced Input Area */}
          <div className="input-area">
            {showImagePreview && image && (
              <div className="image-preview">
                <img src={URL.createObjectURL(image)} alt="Preview" />
                <button onClick={removeImage} className="remove-image">
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="input-form">
              <div className="input-container">
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything... I'm here to help! 🤔"
                    disabled={loading}
                  />

                  <div className="input-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      style={{ display: "none" }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="action-btn image-btn"
                      disabled={loading}
                    >
                      <Camera size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`action-btn mic-btn ${
                        isRecording ? "recording" : ""
                      }`}
                      disabled={loading}
                    >
                      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                      type="submit"
                      className="action-btn send-btn"
                      disabled={loading || (!input.trim() && !image)}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .ai-doubt-solver-container {
          height: 100vh;
          background: linear-gradient(to bottom, #0F1225, #030014);
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .ai-doubt-solver-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Premium Header */
        .chat-header {
          background: linear-gradient(180deg, rgba(10, 12, 32, 0.95), rgba(6, 8, 24, 0.9));
          color: #ffffff;
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
          z-index: 10;
          position: relative;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .ai-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
          position: relative;
          animation: float 3s ease-in-out infinite;
        }

        .avatar-glow {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          opacity: 0.6;
          filter: blur(8px);
          z-index: -1;
          animation: glow-pulse 2s ease-in-out infinite alternate;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        @keyframes glow-pulse {
          0% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }

        .header-info h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
        }

        .header-info p {
          margin: 4px 0 0 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 16px;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .class-badge {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 20px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }

        .class-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
        }

        .change-class-btn, .settings-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .settings-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .change-class-btn:hover, .settings-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        /* Class Selection Modal - Enhanced */
        .class-selection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .class-selection-modal {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          padding: 64px;
          text-align: center;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.2);
          max-width: 700px;
          width: 90%;
          animation: slideUp 0.8s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header h2 {
          margin: 24px 0 16px 0;
          font-size: 36px;
          font-weight: 900;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-header p {
          color: #666;
          font-size: 20px;
          margin: 0 0 24px 0;
          font-weight: 500;
        }

        .sparkle-container {
          position: relative;
          display: inline-block;
        }

        .sparkle-icon {
          color: #667eea;
          animation: sparkle-rotate 3s linear infinite;
        }

        @keyframes sparkle-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sparkle-effects {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #667eea;
          border-radius: 50%;
          animation: sparkle-float 2s ease-in-out infinite;
        }

        .sparkle-1 { top: -20px; left: -10px; animation-delay: 0s; }
        .sparkle-2 { top: -15px; right: -15px; animation-delay: 0.7s; }
        .sparkle-3 { bottom: -20px; left: -5px; animation-delay: 1.4s; }

        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0px); opacity: 1; }
          50% { transform: translateY(-10px); opacity: 0.7; }
        }

        .class-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }

        .class-card {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 28px 20px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        }

        .class-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s ease;
        }

        .class-card:hover::before {
          left: 100%;
        }

        .class-card:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 16px 48px rgba(102, 126, 234, 0.4);
        }

        .card-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 22px;
          opacity: 0;
          filter: blur(8px);
          z-index: -1;
          transition: opacity 0.3s ease;
        }

        .class-card:hover .card-glow {
          opacity: 0.6;
        }

        .class-number {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .class-label {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 600;
        }

        /* Settings Panel */
        .settings-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          margin: 20px 32px;
          padding: 24px;
          display: flex;
          gap: 32px;
          align-items: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          animation: slideDown 0.5s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .setting-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .setting-group label {
          font-size: 16px;
          font-weight: 700;
          color: #333;
        }

        .subject-select, .style-select {
          padding: 12px 16px;
          border: 2px solid rgba(102, 126, 234, 0.2);
          border-radius: 12px;
          background: white;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .subject-select:focus, .style-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

                 /* Chat Interface */
         .chat-interface {
           flex: 1;
           display: flex;
           flex-direction: column;
           max-width: 1400px;
           margin: 0 auto;
           width: 100%;
           padding: 32px;
           gap: 32px;
           min-height: 0;
           overflow: hidden;
         }

                 .messages-container {
           flex: 1;
           overflow-y: auto;
           overflow-x: hidden;
           padding: 20px;
           display: flex;
           flex-direction: column;
           gap: 24px;
           background: rgba(255, 255, 255, 0.05);
           border-radius: 24px;
           backdrop-filter: blur(10px);
           max-height: calc(100vh - 300px);
           scroll-behavior: smooth;
         }

         .messages-container::-webkit-scrollbar {
           width: 8px;
         }

         .messages-container::-webkit-scrollbar-track {
           background: rgba(255, 255, 255, 0.1);
           border-radius: 4px;
         }

         .messages-container::-webkit-scrollbar-thumb {
           background: linear-gradient(135deg, #667eea, #764ba2);
           border-radius: 4px;
         }

         .messages-container::-webkit-scrollbar-thumb:hover {
           background: linear-gradient(135deg, #5a6fd8, #6a42a0);
         }

        .message {
          display: flex;
          max-width: 80%;
          animation: messageSlide 0.5s ease;
        }

        @keyframes messageSlide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .message.user {
          align-self: flex-end;
        }

        .message.ai {
          align-self: flex-start;
        }

        .message-content {
          width: 100%;
        }

                 .message-bubble {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
          color: #1f2937;
        }

        .message.user .message-bubble {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .message-bubble::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }

        .message.user .message-bubble::before {
          background: rgba(255, 255, 255, 0.3);
        }

        .message-bubble p {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          font-weight: 500;
        }

        /* Typing Animation */
        .animated-text {
          display: inline;
        }

        .typing-cursor {
          display: inline-block;
          background: #667eea;
          color: #667eea;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Enhanced Features Styling */
        .confidence-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-radius: 20px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.1);
          animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .confidence-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-label {
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
        }

        .confidence-bar {
          flex: 1;
          height: 8px;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.8s ease;
          border-radius: 4px;
        }

        .confidence-text {
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
        }

        .key-concepts {
          margin-top: 20px;
        }

        .concepts-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .concepts-label {
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        .concepts-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .concept-tag {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .concept-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .followup-suggestions {
          margin-top: 24px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
          border-radius: 20px;
          border: 2px solid rgba(102, 126, 234, 0.2);
          animation: slideIn 0.6s ease;
        }

        .followup-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .followup-label {
          font-size: 16px;
          font-weight: 800;
          color: #667eea;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .followup-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .followup-btn {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-radius: 18px;
          padding: 18px 24px;
          font-size: 15px;
          color: #667eea;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-align: left;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .followup-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
          transition: left 0.6s ease;
        }

        .followup-btn:hover::before {
          left: 100%;
        }

        .followup-btn:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-color: #667eea;
          transform: translateX(12px) scale(1.03);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.3);
        }

        .followup-btn:hover .followup-icon {
          transform: scale(1.1);
        }

        .followup-icon {
          font-size: 18px;
          opacity: 0.9;
          flex-shrink: 0;
        }

        .followup-text {
          flex: 1;
          line-height: 1.4;
        }

        .followup-arrow {
          margin-left: auto;
          font-size: 20px;
          font-weight: bold;
          opacity: 0.7;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .followup-btn:hover .followup-arrow {
          opacity: 1;
          transform: translateX(4px);
        }

        .learning-resources {
          margin-top: 20px;
        }

        .resources-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .resources-label {
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        .resources-list {
          margin: 0;
          padding-left: 20px;
        }

        .resource-item {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .resource-item:hover {
          background: rgba(102, 126, 234, 0.1);
          transform: translateX(4px);
        }

        .resource-icon {
          font-size: 16px;
          opacity: 0.8;
        }

        .message-time {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 12px;
          text-align: right;
        }

        .message.ai .message-time {
          color: #999;
          text-align: left;
        }

        .message-image {
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .message-image img {
          width: 100%;
          max-width: 400px;
          height: auto;
          display: block;
        }

        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          align-items: center;
          padding: 20px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #667eea;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Enhanced Input Area */
        .input-area {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          padding: 24px;
          box-shadow: 0 16px 64px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .image-preview {
          position: relative;
          margin-bottom: 16px;
          display: inline-block;
        }

        .image-preview img {
          max-width: 200px;
          max-height: 150px;
          border-radius: 16px;
          object-fit: cover;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .remove-image {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff6b6b;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(255, 107, 107, 0.4);
          transition: all 0.3s ease;
        }

        .remove-image:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(255, 107, 107, 0.6);
        }

        .input-form {
          width: 100%;
        }

        .input-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 32px;
          padding: 8px;
          border: 2px solid rgba(102, 126, 234, 0.1);
          transition: all 0.3s ease;
        }

        .input-wrapper:focus-within {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .input-wrapper input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 16px 24px;
          font-size: 16px;
          outline: none;
          color: #1a1a1a;
          font-weight: 500;
        }

        .input-wrapper input::placeholder {
          color: #999;
          font-weight: 500;
        }

        .input-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .action-btn:hover::before {
          opacity: 1;
        }

        .action-btn svg {
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .action-btn:hover svg {
          color: white;
          transform: scale(1.1);
        }

        .image-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .mic-btn {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
        }

        .mic-btn.recording {
          animation: record-pulse 1s ease-in-out infinite;
        }

        @keyframes record-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .send-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        }

        .send-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .send-btn:disabled::before {
          display: none;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 20px;
            padding: 16px 0;
          }
          
          .class-selection-modal {
            padding: 40px 24px;
          }
          
          .class-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .message {
            max-width: 90%;
          }

          .settings-panel {
            flex-direction: column;
            gap: 16px;
            margin: 16px;
            padding: 20px;
          }

          .chat-interface {
            padding: 20px;
          }

          .input-area {
            padding: 20px;
            border-radius: 24px;
          }
        }

        /* Scroll to bottom button */
        .scroll-to-bottom-btn {
          position: fixed;
          bottom: 120px;
          right: 40px;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1000;
          animation: slideIn 0.5s ease;
        }

        .scroll-to-bottom-btn:hover {
          transform: translateY(-4px) scale(1.1);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 480px) {
          .header-info h1 {
            font-size: 24px;
          }

          .modal-header h2 {
            font-size: 28px;
          }

          .class-card {
            padding: 20px 16px;
          }

          .class-number {
            font-size: 24px;
          }

          .scroll-to-bottom-btn {
            bottom: 100px;
            right: 20px;
            width: 45px;
            height: 45px;
          }
        }
      `}</style>
    </div>
  );
};

export default AiDoubtSolverChatbox;
