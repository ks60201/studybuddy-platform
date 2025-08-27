import React, { useState, useEffect, useRef } from "react";
import "./Level1.css";
import InteractiveDiagram from "./InteractiveDiagram";
import { motion, AnimatePresence } from "framer-motion";

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface LectureStatus {
  is_running: boolean;
  has_streamer: boolean;
}

interface LectureResponse {
  status: string;
  message: string;
  lecture_status?: string;
}

interface DetailedLectureStatus {
  lecture_running: boolean;
  lecture_paused: boolean;
  audio_paused?: boolean;
  current_section: string | null;
  current_section_index: number;
  total_sections: number;
  progress_percentage: number;
}

interface TranscriptItem {
  id: string;
  topic: string;
  content: string;
  timestamp: string;
  isActive: boolean;
}

interface BackendTranscript {
  lecture_start_time: string | null;
  sections: string[];
  transcript: Array<{
    section: string;
    text: string;
    timestamp: string;
    section_index: number;
  }>;
  total_entries: number;
}

// NEW: Flashcard interfaces
interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic: string;
  difficulty: string;
  subject: string;
  class_level: string;
}

interface FlashcardSet {
  title: string;
  class_level: string;
  subject: string;
  topic: string;
  total_cards: number;
  flashcards: Flashcard[];
  generated_at: string;
  difficulty_level: string;
}

// NEW: Teacher Profile and Branding
interface TeacherProfile {
  name: string;
  avatar: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  subject: string;
}

// NEW: Keyword Animation Mapping
interface KeywordAnimation {
  keyword: string;
  icon: string;
  animation: string;
  color: string;
}

const PhysicsWavesLevel1: React.FC = () => {
  // NEW: Teacher Profile for Physics Waves
  const teacherProfile: TeacherProfile = {
    name: "Professor Wave",
    avatar: "🌊",
    colorScheme: {
      primary: "from-blue-600 to-cyan-500",
      secondary: "from-indigo-600 to-purple-500",
      accent: "from-yellow-400 to-orange-500",
      background: "from-slate-900 via-blue-900 to-slate-900",
    },
    subject: "Physics - Waves",
  };

  // NEW: Keyword Animation Mapping
  const keywordAnimations: KeywordAnimation[] = [
    {
      keyword: "sound waves",
      icon: "🔊",
      animation: "bounce",
      color: "text-blue-400",
    },
    {
      keyword: "light waves",
      icon: "💡",
      animation: "pulse",
      color: "text-yellow-400",
    },
    {
      keyword: "energy",
      icon: "⚡",
      animation: "ping",
      color: "text-green-400",
    },
    {
      keyword: "frequency",
      icon: "📊",
      animation: "spin",
      color: "text-purple-400",
    },
    {
      keyword: "amplitude",
      icon: "📈",
      animation: "bounce",
      color: "text-red-400",
    },
    {
      keyword: "wavelength",
      icon: "📏",
      animation: "pulse",
      color: "text-cyan-400",
    },
    {
      keyword: "medium",
      icon: "🌊",
      animation: "bounce",
      color: "text-blue-400",
    },
    {
      keyword: "vacuum",
      icon: "🌌",
      animation: "pulse",
      color: "text-indigo-400",
    },
    {
      keyword: "mechanical",
      icon: "⚙️",
      animation: "spin",
      color: "text-gray-400",
    },
    {
      keyword: "electromagnetic",
      icon: "⚡",
      animation: "ping",
      color: "text-yellow-400",
    },
  ];

  const [lectureStatus, setLectureStatus] = useState<LectureStatus>({
    is_running: false,
    has_streamer: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLectureStarted, setIsLectureStarted] = useState(false);
  const [qaPrompt, setQaPrompt] = useState<string>("");
  const [qaResponse, setQaResponse] = useState<string>("");
  const [showQaModal, setShowQaModal] = useState(false);

  // NEW: Helper function to detect and highlight keywords
  const highlightKeywords = (text: string) => {
    let highlightedText = text;
    const detectedKeywords: {
      keyword: string;
      icon: string;
      animation: string;
      color: string;
    }[] = [];

    keywordAnimations.forEach(({ keyword, icon, animation, color }) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      if (regex.test(text)) {
        detectedKeywords.push({ keyword, icon, animation, color });
        highlightedText = highlightedText.replace(
          regex,
          `<span class="font-bold text-yellow-400 bg-yellow-900/20 px-1 rounded">${keyword}</span>`
        );
      }
    });

    return { highlightedText, detectedKeywords };
  };

  // NEW: Function to update lecture topic with smooth transitions
  const updateLectureTopic = (newTopic: string) => {
    if (newTopic !== currentLectureTopic) {
      setTopicTransitionKey((prev) => prev + 1);
      setCurrentLectureTopic(newTopic);
    }
  };

  // Close diagram overlay when Q&A modal opens
  useEffect(() => {
    if (showQaModal) {
      setShowDiagramOverlay(false);
      setDiagramInfo(null);
      setDiagramImageUrl(null);
      // Don't reset diagramManuallyClosed - preserve user's choice
    }
  }, [showQaModal]);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [currentLectureTopic, setCurrentLectureTopic] = useState<string>(
    "Waiting for lecture to begin..."
  );
  const [topicTransitionKey, setTopicTransitionKey] = useState<number>(0);
  const [detailedLectureStatus, setDetailedLectureStatus] =
    useState<DetailedLectureStatus>({
      lecture_running: false,
      lecture_paused: false,
      audio_paused: false,
      current_section: null,
      current_section_index: 0,
      total_sections: 7,
      progress_percentage: 0,
    });
  const [backendTranscript, setBackendTranscript] =
    useState<BackendTranscript | null>(null);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [voicePlaceholder, setVoicePlaceholder] = useState(
    "Type your response..."
  );

  // NEW: Flashcard and revision states
  const [isLectureComplete, setIsLectureComplete] = useState(false);
  const [showRevisionSection, setShowRevisionSection] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isSavingLecture, setIsSavingLecture] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedLectureId, setSavedLectureId] = useState<string | null>(null);

  // NEW: Diagram overlay states
  const [showDiagramOverlay, setShowDiagramOverlay] = useState(false);
  const [diagramInfo, setDiagramInfo] = useState<any>(null);
  const [diagramImageUrl, setDiagramImageUrl] = useState<string | null>(null);
  // Flag to prevent diagram overlay from reopening after user manually closes it
  const [diagramManuallyClosed, setDiagramManuallyClosed] = useState(false);

  // NEW: Interactive diagram states
  const [showInteractiveDiagram, setShowInteractiveDiagram] = useState(false);
  const [diagramLabels, setDiagramLabels] = useState<any[]>([]);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(
    null
  );
  const [isExplaining, setIsExplaining] = useState(false);
  const [interactiveTranscript, setInteractiveTranscript] = useState<any[]>([]);

  const websocketRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const API_BASE_URL = "http://localhost:8000";
  const API_ENDPOINT = "/api/lectures/class7/science/physics/waves/level1";
  const WS_URL = `ws://localhost:8000${API_ENDPOINT}/ws`;

  // Check for speech recognition support
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setIsVoiceSupported(true);
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setVoicePlaceholder("🎤 Listening... Speak now!");
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQaResponse(transcript);
        setVoicePlaceholder("Type your response...");
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setVoicePlaceholder("Type your response...");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setVoicePlaceholder("Type your response...");
      };
    } else {
      setIsVoiceSupported(false);
    }
  }, []);

  // Auto-scroll to bottom of transcript
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  // Periodically update lecture status and transcript
  useEffect(() => {
    if (isLectureStarted) {
      const statusInterval = setInterval(() => {
        // Don't update status during Q&A to avoid interference
        if (!showQaModal) {
          getDetailedLectureStatus();
        }
      }, 200); // Update every 30 seconds

      const transcriptInterval = setInterval(() => {
        getBackendTranscript();
      }, 1500); // Update every 15 seconds

      const diagramInterval = setInterval(() => {
        // Don't check diagrams during Q&A to avoid interference
        if (!showQaModal) {
          checkDiagramStatus();
        }
      }, 200); // Check diagram status every 3 minutes (180,000 ms)

      return () => {
        clearInterval(statusInterval);
        clearInterval(transcriptInterval);
        clearInterval(diagramInterval);
      };
    }
  }, [isLectureStarted, showQaModal]);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        websocketRef.current = new WebSocket(WS_URL);

        websocketRef.current.onopen = () => {
          // WebSocket connected
        };

        websocketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "qa_prompt") {
              setQaPrompt(data.prompt);
              setShowQaModal(true);
              addTranscriptItem(
                "Q&A Session",
                `Question: ${data.prompt}`,
                "qa"
              );

              // Give user at least 30 seconds to answer before allowing any auto-progression
              setTimeout(() => {
                console.log(
                  "Q&A timeout protection expired - normal progression can resume"
                );
              }, 30000);
            } else if (data.type === "lecture_progress") {
              addTranscriptItem("Lecture Progress", data.message, "progress");
            } else if (data.type === "topic_start") {
              setCurrentTopic(data.topic);
              setDiagramManuallyClosed(false); // Reset flag for new topic
              addTranscriptItem(
                "New Topic",
                `Starting: ${data.topic}`,
                "topic"
              );
            } else if (data.type === "topic_complete") {
              addTranscriptItem(
                "Topic Complete",
                `Completed: ${data.topic}`,
                "complete"
              );
            } else if (data.type === "audio_streaming") {
              addTranscriptItem("Audio", data.message, "audio");
            } else if (data.type === "error") {
              addTranscriptItem("Error", data.message, "error");
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        websocketRef.current.onclose = () => {
          // Try to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        websocketRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const addTranscriptItem = (topic: string, content: string, type: string) => {
    const newItem: TranscriptItem = {
      id: Date.now().toString(),
      topic,
      content,
      timestamp: new Date().toLocaleTimeString(),
      isActive: type === "topic",
    };

    setTranscript((prev) => [...prev, newItem]);
  };

  const startLecture = async () => {
    setIsLoading(true);

    // Clear previous transcript when starting new lecture
    setTranscript([]);
    setBackendTranscript(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/start-lecture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gemini_api_key: "AIzaSyCgPs-85H5nWxxuJoC8aCs4EwfZUjBTsxQ",
            gemini_url:
              "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
          }),
        }
      );

      const data: LectureResponse = await response.json();

      if (data.status === "success") {
        setLectureStatus({
          is_running: true,
          has_streamer: true,
        });
        setIsLectureStarted(true);
        addTranscriptItem(
          "Lecture Started",
          "Physics lecture has begun! Get ready for an amazing learning experience.",
          "start"
        );

        // Reset diagram manually closed flag for new lecture
        setDiagramManuallyClosed(false);

        // Start fetching transcript immediately
        setTimeout(() => {
          getBackendTranscript();
        }, 1000);
      } else {
        console.error("Failed to start lecture:", data.message);
        addTranscriptItem(
          "Error",
          `Failed to start lecture: ${data.message}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error starting lecture:", error);
      addTranscriptItem(
        "Error",
        "Failed to connect to lecture server",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stopLecture = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/stop-lecture`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      setLectureStatus({
        is_running: false,
        has_streamer: false,
      });
      setIsLectureStarted(false);
      addTranscriptItem(
        "Lecture Stopped",
        "Lecture has been stopped. You can start a new lecture anytime.",
        "stop"
      );
    } catch (error) {
      console.error("Error stopping lecture:", error);
      addTranscriptItem("Error", "Failed to stop lecture", "error");
    }
  };

  const pauseLecture = async () => {
    try {
      console.log("Attempting to pause lecture...");
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/pause-lecture`,
        {
          method: "POST",
        }
      );

      const data = await response.json();
      console.log("Pause response:", data);

      if (data.status === "success") {
        addTranscriptItem(
          "Lecture Paused",
          "⏸️ Lecture paused. Click 'Resume' to continue from where you left off.",
          "pause"
        );
        // Force refresh the lecture status to update the UI immediately
        getDetailedLectureStatus();
        setTimeout(() => {
          getDetailedLectureStatus();
        }, 100);
      } else {
        console.error("Pause failed:", data);
        addTranscriptItem(
          "Error",
          `Failed to pause lecture: ${data.detail || data.message}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error pausing lecture:", error);
      addTranscriptItem("Error", "Failed to pause lecture", "error");
    }
  };

  const resumeLecture = async () => {
    try {
      console.log("Attempting to resume lecture...");
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/resume-lecture`,
        {
          method: "POST",
        }
      );

      const data = await response.json();
      console.log("Resume response:", data);

      if (data.status === "success") {
        addTranscriptItem(
          "Lecture Resumed",
          "▶️ Lecture resumed! Continuing from where you left off.",
          "resume"
        );
        // Force refresh the lecture status to update the UI
        setTimeout(() => {
          getDetailedLectureStatus();
        }, 500);
      } else {
        console.error("Resume failed:", data);
        addTranscriptItem(
          "Error",
          `Failed to resume lecture: ${data.detail || data.message}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error resuming lecture:", error);
      addTranscriptItem("Error", "Failed to resume lecture", "error");
    }
  };

  const getDetailedLectureStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/lecture-status`
      );
      const data = await response.json();

      if (data.status === "success") {
        console.log("📊 Lecture status update:", data.data);
        setDetailedLectureStatus(data.data);

        const progressPercentage = data.data.progress_percentage || 0;
        const isAtFinalSection =
          data.data.current_section_index >= data.data.total_sections - 1;
        const shouldMarkComplete =
          progressPercentage >= 100 || isAtFinalSection;

        if (shouldMarkComplete && !isLectureComplete) {
          setIsLectureComplete(true);
          setDiagramManuallyClosed(false); // Reset flag for lecture completion
          addTranscriptItem(
            "Lecture Complete",
            "🎉 Congratulations! You've completed the physics lecture on waves. Generate flashcards to review what you've learned!",
            "complete"
          );
        }
      }
    } catch (error) {
      console.error("Error getting lecture status:", error);
    }
  };

  // NEW: Flashcard generation functions
  const generateFlashcards = async (numCards: number = 10) => {
    setIsGeneratingFlashcards(true);
    setFlashcardError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/flashcards?num_cards=${numCards}`
      );
      const data = await response.json();

      if (data.status === "success") {
        addTranscriptItem(
          "Flashcards Generated",
          `📚 Generated ${data.data.total_cards} flashcards! Redirecting to study mode...`,
          "flashcards"
        );

        // Stop the lecture first
        await stopLecture();

        // Wait a moment for cleanup, then redirect
        setTimeout(() => {
          // Navigate to flashcard page with the generated flashcards
          window.location.href = `/ai-teacher/class7/science/physics/waves/level1/flashcards?data=${encodeURIComponent(
            JSON.stringify(data.data)
          )}`;
        }, 1000);
      } else {
        setFlashcardError(data.message || "Failed to generate flashcards");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      setFlashcardError("Failed to connect to server for flashcard generation");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // NEW: Quiz generation function
  const generateQuiz = async (numQuestions: number = 10) => {
    setIsGeneratingQuiz(true);
    setQuizError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/quiz?num_questions=${numQuestions}`
      );
      const data = await response.json();
      if (data.status === "success") {
        // Stop the lecture first
        await stopLecture();
        // Wait a moment for cleanup, then redirect
        setTimeout(() => {
          window.location.href = `/ai-teacher/class7/science/physics/waves/level1/quiz`;
        }, 1000);
      } else {
        setQuizError(data.message || "Failed to generate quiz");
      }
    } catch (error) {
      setQuizError("Failed to connect to server for quiz generation");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Flashcard navigation functions
  const nextFlashcard = () => {
    if (
      flashcards &&
      currentFlashcardIndex < flashcards.flashcards.length - 1
    ) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setIsFlashcardFlipped(false);
    }
  };

  const previousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setIsFlashcardFlipped(false);
    }
  };

  const flipFlashcard = () => {
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  const resetFlashcards = () => {
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
  };

  // Update transcript fetching
  const getBackendTranscript = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}/transcript`);
      const data = await response.json();

      if (data.status === "success") {
        console.log("Received transcript data:", data.data); // Debug log
        setBackendTranscript(data.data);

        // NEW: Update lecture topic based on latest transcript entry
        if (data.data.transcript && data.data.transcript.length > 0) {
          const latestEntry =
            data.data.transcript[data.data.transcript.length - 1];
          if (
            latestEntry.section &&
            !latestEntry.section.toLowerCase().includes("q&a")
          ) {
            updateLectureTopic(latestEntry.section);
          }
        }
      }
    } catch (error) {
      console.error("Error getting transcript:", error);
    }
  };

  // NEW: Check for diagram status
  const checkDiagramStatus = async () => {
    // Skip diagram check if user has manually closed it
    if (diagramManuallyClosed) {
      console.log(
        "🚫 checkDiagramStatus skipped - diagramManuallyClosed is true"
      );
      return;
    }
    console.log(
      "🔍 checkDiagramStatus running - diagramManuallyClosed is false"
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/diagram-status`
      );
      const data = await response.json();

      if (data.status === "success") {
        const diagramData = data.data;

        // Check if we should show the diagram overlay
        const shouldShow =
          diagramData.should_show_overlay &&
          diagramData.diagram_info &&
          !showQaModal &&
          !showInteractiveDiagram; // Don't show regular diagram when interactive is active

        // Check if we're still in diagram explanation section
        const isInDiagramSection =
          diagramData.current_section === "diagram_explanation" ||
          diagramData.current_section?.toLowerCase().includes("diagram") ||
          diagramData.current_section?.toLowerCase().includes("wave");

        if (shouldShow && isInDiagramSection && !diagramManuallyClosed) {
          // Show diagram overlay only if not manually closed
          if (!showDiagramOverlay) {
            setDiagramInfo(diagramData.diagram_info);
            const imageUrl = `${API_BASE_URL}${API_ENDPOINT}/diagram-image/${diagramData.diagram_info.image_filename}`;
            setDiagramImageUrl(imageUrl);
            setShowDiagramOverlay(true);

            // Add transcript entry for diagram display
            addTranscriptItem(
              "Diagram Display",
              diagramData.diagram_info.message ||
                "🖼️ Wave diagram is now displayed for detailed explanation.",
              "diagram"
            );
          }
        } else if (showDiagramOverlay && !diagramManuallyClosed) {
          // Hide overlay if we're not in diagram section or should not show
          // BUT only if user hasn't manually closed it
          setShowDiagramOverlay(false);
          setDiagramInfo(null);
          setDiagramImageUrl(null);
          // Don't reset diagramManuallyClosed here - let user's choice persist

          // Add transcript entry for diagram completion
          addTranscriptItem(
            "Diagram Complete",
            "✅ Diagram explanation completed. Continuing with the lecture...",
            "diagram"
          );
        }
      }
    } catch (error) {
      console.error("Error checking diagram status:", error);
    }
  };

  const submitQAResponse = () => {
    if (qaResponse.trim() && websocketRef.current) {
      websocketRef.current.send(
        JSON.stringify({
          type: "qa_response",
          response: qaResponse.trim(),
        })
      );

      addTranscriptItem(
        "Q&A Response",
        `Your answer: ${qaResponse}`,
        "response"
      );
      setQaResponse("");
      setShowQaModal(false);
      setQaPrompt("");
    }
  };

  const startVoiceRecognition = () => {
    if (recognitionRef.current && isVoiceSupported) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting voice recognition:", error);
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const closeDiagramManually = () => {
    console.log("🔒 closeDiagramManually called - closing diagram overlay");
    setShowDiagramOverlay(false);
    setDiagramInfo(null);
    setDiagramImageUrl(null);
    setDiagramManuallyClosed(true);
    console.log("✅ diagramManuallyClosed set to true");
  };

  // NEW: Interactive diagram functions
  const activateInteractiveDiagram = async () => {
    console.log("🚀 Activating interactive diagram...");
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/interactive-diagram/activate`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      console.log("📡 Interactive diagram activation response:", data);

      if (data.status === "success") {
        setDiagramLabels(data.data.labels);
        // Set the diagram image URL
        const imageUrl = `${API_BASE_URL}${API_ENDPOINT}/diagram-image/image1.png`;
        setDiagramImageUrl(imageUrl);
        setShowInteractiveDiagram(true);
        console.log("✅ Interactive diagram activated successfully");

        // Add transcript entry to inform user about interactive mode
        addTranscriptItem(
          "Interactive Diagram",
          "🌊 Interactive wave diagram activated! Click on labels to hear detailed explanations.",
          "interactive"
        );
      }
    } catch (error) {
      console.error("❌ Error activating interactive diagram:", error);
    }
  };

  const handleLabelClick = async (label: any) => {
    console.log("🎯 Label clicked:", label.name);
    setIsExplaining(true);
    setCurrentExplanation(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/interactive-diagram/explain-label`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ label: label.name }),
        }
      );
      const data = await response.json();
      console.log("📡 Label explanation response:", data);

      if (data.status === "success") {
        setCurrentExplanation(data.data.explanation);

        // Add to interactive transcript
        const newEntry = {
          section: `Label: ${label.name}`,
          text: data.data.explanation,
          timestamp: new Date().toISOString(),
        };
        console.log("📝 Adding to interactive transcript:", newEntry);
        setInteractiveTranscript((prev) => {
          const updated = [...prev, newEntry];
          console.log("📋 Updated interactive transcript:", updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("❌ Error explaining label:", error);
      setCurrentExplanation("Sorry, there was an error explaining this label.");
    } finally {
      setIsExplaining(false);
    }
  };

  const closeInteractiveDiagram = async () => {
    console.log("🔒 Closing interactive diagram...");

    // If currently explaining, wait a bit for the explanation to complete
    if (isExplaining) {
      console.log("⏳ Currently explaining, waiting for completion...");
      // Wait for explanation to finish (give it some time)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    try {
      // Call backend to deactivate interactive diagram (this will resume lecture)
      await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/interactive-diagram/deactivate`,
        {
          method: "POST",
        }
      );

      // Update frontend state
      setShowInteractiveDiagram(false);
      setCurrentExplanation(null);
      setIsExplaining(false);
      setInteractiveTranscript([]); // Clear interactive transcript
      console.log("✅ Interactive diagram closed and transcript cleared");

      // Add transcript entry to inform user about returning to lecture
      addTranscriptItem(
        "Interactive Diagram",
        "✅ Interactive diagram closed. Returning to lecture mode...",
        "interactive"
      );
    } catch (error) {
      console.error("❌ Error deactivating interactive diagram:", error);
      // Still close the diagram even if backend call fails
      setShowInteractiveDiagram(false);
      setCurrentExplanation(null);
      setIsExplaining(false);
      setInteractiveTranscript([]); // Clear interactive transcript
      console.log(
        "✅ Interactive diagram closed manually and transcript cleared"
      );

      // Add transcript entry for manual closure
      addTranscriptItem(
        "Interactive Diagram",
        "✅ Interactive diagram closed manually.",
        "interactive"
      );
    }
  };

  const saveLecture = async () => {
    setIsSavingLecture(true);
    setSaveError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setSaveError("Please log in to save the lecture");
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
        setSaveError("Authentication failed. Please log in again.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINT}/save-current-lecture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setSaveError(errorData.detail || `Server error: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === "success") {
        addTranscriptItem(
          "Lecture Saved",
          "📚 Lecture saved successfully! You can access it in the Revision Cards section.",
          "save"
        );
        setSavedLectureId(data.lecture_id); // Store the saved lecture ID
      } else {
        setSaveError(data.message || "Failed to save lecture");
      }
    } catch (error) {
      console.error("Error saving lecture:", error);
      setSaveError("Failed to connect to server while saving lecture");
    } finally {
      setIsSavingLecture(false);
    }
  };

  // If lecture hasn't started, show the start button
  if (!isLectureStarted) {
    return (
      <div className="lecture-start-container">
        <div className="start-content">
          <div className="ai-robot-large">
            <div className="robot-head">
              <div className="robot-eyes">
                <div className="eye left-eye"></div>
                <div className="eye right-eye"></div>
              </div>
              <div className="robot-mouth"></div>
            </div>
            <div className="robot-body">
              <div className="robot-antenna"></div>
              <div className="robot-chest">
                <div className="chest-light"></div>
              </div>
            </div>
          </div>

          <h1 className="start-title">🎓 Physics Lecture</h1>
          <h2 className="start-subtitle">🌊 Waves - Level 1</h2>
          <p className="start-description">
            Get ready for an interactive physics lecture with AI-powered
            explanations, real-time Q&A sessions, and immersive learning
            experience.
          </p>

          <button
            onClick={() => {
              startLecture();
            }}
            disabled={isLoading}
            className="start-lecture-btn"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Starting Lecture...
              </>
            ) : (
              <>
                <span className="btn-icon">▶️</span>
                Start Lecture
              </>
            )}
          </button>

          <div className="features-preview">
            <div className="feature-item">
              <span className="feature-icon">🎤</span>
              <span>AI Voice Narration</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">❓</span>
              <span>Interactive Q&A</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <span>Live Transcript</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎙️</span>
              <span>Voice Recognition</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main lecture interface
  return (
    <div
      className={`lecture-container bg-gradient-to-br ${teacherProfile.colorScheme.background} min-h-screen`}
    >
      {/* Left Side - AI Robot and Controls */}
      <div className="ai-panel">
        {/* NEW: Teacher Profile Header */}
        <motion.div
          className="teacher-profile-header mb-6 p-4 rounded-xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="teacher-avatar text-4xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {teacherProfile.avatar}
            </motion.div>
            <div className="teacher-info">
              <h2 className="text-xl font-bold text-white mb-1">
                {teacherProfile.name}
              </h2>
              <p className="text-cyan-300 text-sm">{teacherProfile.subject}</p>
            </div>
          </div>
        </motion.div>

        <div className="ai-robot">
          <div className="robot-head">
            <div className="robot-eyes">
              <div className="eye left-eye"></div>
              <div className="eye right-eye"></div>
            </div>
            <div className="robot-mouth"></div>
          </div>
          <div className="robot-body">
            <div className="robot-antenna"></div>
            <div className="robot-chest">
              <div className="chest-light"></div>
            </div>
          </div>
        </div>

        <div className="sound-waves">
          <div className="wave-container">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>

        <div className="current-topic">
          <h3 className="text-white font-semibold mb-2">🎯 Current Topic</h3>
          <AnimatePresence mode="wait">
            <motion.p
              key={topicTransitionKey}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-lg font-medium text-cyan-300 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 px-4 py-2 rounded-lg backdrop-blur-sm"
            >
              {currentLectureTopic}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="lecture-status-indicator">
          <div
            className={`status-dot ${
              lectureStatus.is_running ? "active" : "inactive"
            }`}
          ></div>
          <span>{lectureStatus.is_running ? "Live" : "Stopped"}</span>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${detailedLectureStatus.progress_percentage}%`,
              }}
            ></div>
          </div>
          <div className="progress-text">
            Section {detailedLectureStatus.current_section_index + 1} of{" "}
            {detailedLectureStatus.total_sections}(
            {Math.round(detailedLectureStatus.progress_percentage)}%)
          </div>
        </div>

        {/* NEW: Lecture Completion and Flashcard Generation */}
        {isLectureComplete && (
          <div className="completion-section">
            <div className="completion-celebration">
              <div className="celebration-icon">🎉</div>
              <h3>Lecture Complete!</h3>
              <p>Great job! Ready to test your knowledge?</p>
            </div>

            <div className="revision-buttons">
              <button
                onClick={saveLecture}
                disabled={isSavingLecture}
                className="revision-btn primary"
              >
                {isSavingLecture ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">💾</span>
                    Save Lecture
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  generateFlashcards(10);
                }}
                disabled={isGeneratingFlashcards}
                className="revision-btn primary"
              >
                {isGeneratingFlashcards ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🎴</span>
                    Generate Flashcards
                  </>
                )}
              </button>

              <button
                onClick={() => generateQuiz(10)}
                disabled={isGeneratingQuiz}
                className="revision-btn primary"
              >
                {isGeneratingQuiz ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">📝</span>
                    Generate AI Quiz
                  </>
                )}
              </button>

              <button
                onClick={activateInteractiveDiagram}
                className="revision-btn primary"
              >
                <span className="btn-icon">🌊</span>
                Interactive Diagram
              </button>

              {showRevisionSection && (
                <button
                  onClick={() => setShowRevisionSection(!showRevisionSection)}
                  className="revision-btn toggle"
                >
                  {showRevisionSection
                    ? "📖 Back to Transcript"
                    : "🎴 View Flashcards"}
                </button>
              )}
            </div>

            {saveError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {saveError}
              </div>
            )}

            {flashcardError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {flashcardError}
              </div>
            )}
            {quizError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {quizError}
              </div>
            )}
          </div>
        )}

        {/* Lecture Controls */}
        <div className="lecture-controls-container">
          <div className="lecture-controls">
            {(() => {
              console.log(
                "🎛️ Rendering controls - lecture_paused:",
                detailedLectureStatus.lecture_paused
              );
              return detailedLectureStatus.lecture_paused ? (
                <motion.button
                  onClick={resumeLecture}
                  className="control-btn resume-btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">▶️</span>
                    <span>Resume</span>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  onClick={pauseLecture}
                  className="control-btn pause-btn bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(245, 158, 11, 0.3)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏸️</span>
                    <span>Pause</span>
                  </div>
                </motion.button>
              );
            })()}
            <motion.button
              onClick={stopLecture}
              className="control-btn stop-btn bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">⏹️</span>
                <span>Stop</span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Right Side - Transcript or Revision Section */}
      <div className="transcript-panel">
        {!showRevisionSection ? (
          <>
            <motion.div
              className="transcript-header bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-xl p-4 mb-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="text-2xl"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  📝
                </motion.div>
                <h2 className="text-xl font-bold text-white">
                  Live Lecture Transcript
                </h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-cyan-300">
                    {teacherProfile.name}
                  </span>
                </div>
              </div>
            </motion.div>

            <div className="transcript-content space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-gray-800">
              {backendTranscript && backendTranscript.transcript.length > 0 ? (
                backendTranscript.transcript.map((entry, index) => {
                  const isQA = entry.section.toLowerCase().includes("q&a");
                  const [question, answer] = isQA
                    ? entry.text.split("Answer: ")
                    : [];

                  return (
                    <motion.div
                      key={index}
                      className={`transcript-item ${
                        entry.section_index ===
                        detailedLectureStatus.current_section_index
                          ? "active bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shadow-lg shadow-cyan-500/20"
                          : "bg-gradient-to-r from-white/5 to-white/10"
                      } bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-4 backdrop-blur-sm transition-all duration-300`}
                      data-type={isQA ? "qa" : "lecture"}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1,
                        ease: "easeOut",
                      }}
                      whileHover={{
                        scale: 1.02,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <div className="transcript-header-item bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <motion.span
                            className="transcript-topic font-semibold text-cyan-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {entry.section}
                          </motion.span>
                          <motion.span
                            className="transcript-time text-xs text-gray-400"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </motion.span>
                        </div>
                      </div>
                      <div className="transcript-text">
                        {isQA ? (
                          <>
                            {question && (
                              <div className="qa-question">{question}</div>
                            )}
                            {answer && (
                              <div className="qa-answer">{answer}</div>
                            )}
                            {!question && !answer && entry.text}
                          </>
                        ) : (
                          <div className="relative">
                            {/* Keyword Animations */}
                            <div className="absolute -top-2 -right-2 flex gap-1">
                              {(() => {
                                const { detectedKeywords } = highlightKeywords(
                                  entry.text
                                );
                                return detectedKeywords.map((keyword, idx) => (
                                  <motion.div
                                    key={`${keyword.keyword}-${idx}`}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{
                                      duration: 0.5,
                                      delay: idx * 0.1,
                                      type: "spring",
                                      stiffness: 200,
                                    }}
                                    className={`text-2xl ${keyword.color} drop-shadow-lg`}
                                  >
                                    {keyword.icon}
                                  </motion.div>
                                ));
                              })()}
                            </div>

                            {/* Highlighted Text */}
                            <div
                              dangerouslySetInnerHTML={{
                                __html: highlightKeywords(entry.text)
                                  .highlightedText,
                              }}
                              className="text-gray-100 leading-relaxed"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  className="transcript-item bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <div className="text-center">
                    <motion.div
                      className="text-4xl mb-4"
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      🎓
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Transcript Yet
                    </h3>
                    <p className="text-gray-300">
                      Waiting for {teacherProfile.name} to begin the lecture...
                    </p>
                    <div className="mt-4 flex justify-center">
                      <motion.div
                        className="flex gap-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <div
                          className="w-2 h-2 bg-cyan-400 rounded-full"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-cyan-400 rounded-full"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </>
        ) : (
          <>
            {/* NEW: Flashcards Section */}
            <div className="revision-header">
              <h2>🎴 Study Flashcards</h2>
              <button
                onClick={() => setShowRevisionSection(false)}
                className="back-to-transcript-btn"
              >
                📖 Back to Transcript
              </button>
            </div>

            <div className="revision-content">
              {/* Flashcards Section */}
              {flashcards && flashcards.flashcards.length > 0 && (
                <div className="flashcards-section">
                  <div className="flashcards-header">
                    <h3>🎴 Flashcards</h3>
                    <div className="flashcard-counter">
                      {currentFlashcardIndex + 1} of{" "}
                      {flashcards.flashcards.length}
                    </div>
                  </div>

                  <div className="flashcard-container">
                    <div
                      className={`flashcard ${
                        isFlashcardFlipped ? "flipped" : ""
                      }`}
                      onClick={flipFlashcard}
                    >
                      {/* Question Side */}
                      <div className="flashcard-front">
                        <div className="flashcard-content">
                          <div className="question-label">❓ Question</div>
                          <div className="question-text">
                            {
                              flashcards.flashcards[currentFlashcardIndex]
                                ?.question
                            }
                          </div>
                          <div className="flip-instruction">
                            👆 Click to reveal answer
                          </div>
                        </div>
                      </div>

                      {/* Answer Side */}
                      <div className="flashcard-back">
                        <div className="flashcard-content">
                          <div className="answer-label">✅ Answer</div>
                          <div className="answer-text">
                            {
                              flashcards.flashcards[currentFlashcardIndex]
                                ?.answer
                            }
                          </div>
                          <div className="topic-badge">
                            📚{" "}
                            {
                              flashcards.flashcards[currentFlashcardIndex]
                                ?.topic
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flashcard-controls">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previousFlashcard();
                        }}
                        disabled={currentFlashcardIndex === 0}
                        className="flashcard-nav-btn prev"
                      >
                        ⬅️ Previous
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          flipFlashcard();
                        }}
                        className="flip-btn"
                      >
                        {isFlashcardFlipped
                          ? "🔄 Show Question"
                          : "💡 Show Answer"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextFlashcard();
                        }}
                        disabled={
                          currentFlashcardIndex ===
                          flashcards.flashcards.length - 1
                        }
                        className="flashcard-nav-btn next"
                      >
                        Next ➡️
                      </button>
                    </div>

                    <div className="flashcard-progress">
                      <div className="progress-dots">
                        {flashcards.flashcards.map((_, index) => (
                          <div
                            key={index}
                            className={`progress-dot ${
                              index === currentFlashcardIndex ? "active" : ""
                            }`}
                            onClick={() => {
                              setCurrentFlashcardIndex(index);
                              setIsFlashcardFlipped(false);
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flashcard-stats">
                      <div className="stat-item">
                        <span className="stat-label">Topic:</span>
                        <span className="stat-value">{flashcards.topic}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Subject:</span>
                        <span className="stat-value">{flashcards.subject}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Cards:</span>
                        <span className="stat-value">
                          {flashcards.total_cards}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* NEW: Diagram Overlay */}
      {showDiagramOverlay && diagramImageUrl && !showInteractiveDiagram && (
        <div className="diagram-overlay-container">
          <div
            className="diagram-overlay-backdrop"
            onClick={closeDiagramManually}
          ></div>
          <div className="diagram-overlay-content">
            <div className="diagram-overlay-header">
              <h3>🖼️ Wave Diagram</h3>
              <button
                className="diagram-close-btn"
                onClick={closeDiagramManually}
              >
                ✕
              </button>
            </div>
            <div className="diagram-main-content">
              <div className="diagram-image-section">
                <div className="diagram-image-container">
                  <img
                    src={diagramImageUrl}
                    alt="Wave Diagram"
                    className="diagram-image"
                    onError={(e) => {
                      console.error("Error loading diagram image");
                      closeDiagramManually();
                    }}
                  />
                </div>
              </div>
              <div className="diagram-explanation-section">
                <div className="diagram-explanation">
                  <h4>📖 Explanation</h4>
                  <p>
                    {diagramInfo?.message ||
                      "Study this wave diagram carefully. Notice the wave patterns and properties."}
                  </p>
                  <div className="diagram-tips">
                    <div className="tip-item">
                      <span className="tip-icon">📏</span>
                      <span>
                        Observe the wavelength - distance between peaks
                      </span>
                    </div>
                    <div className="tip-item">
                      <span className="tip-icon">📐</span>
                      <span>Notice the amplitude - height of the wave</span>
                    </div>
                    <div className="tip-item">
                      <span className="tip-icon">🔄</span>
                      <span>See the repeating pattern of the wave</span>
                    </div>
                  </div>

                  {/* Live transcript during diagram explanation */}
                  <div className="diagram-transcript">
                    <h4>🎤 Live Explanation</h4>
                    <div className="diagram-transcript-content">
                      {backendTranscript &&
                        backendTranscript.transcript
                          .filter(
                            (entry) =>
                              entry.section_index ===
                                detailedLectureStatus.current_section_index &&
                              (entry.section
                                .toLowerCase()
                                .includes("diagram") ||
                                entry.section.toLowerCase().includes("wave"))
                          )
                          .map((entry, index) => (
                            <div
                              key={index}
                              className="diagram-transcript-item active"
                            >
                              <div className="diagram-transcript-time">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </div>
                              <div className="diagram-transcript-text">
                                {entry.text}
                              </div>
                            </div>
                          ))}
                      {(!backendTranscript ||
                        !backendTranscript.transcript.some(
                          (entry) =>
                            entry.section.toLowerCase().includes("diagram") ||
                            entry.section.toLowerCase().includes("wave")
                        )) && (
                        <div className="diagram-transcript-item">
                          <div className="diagram-transcript-text">
                            🎧 Listen to the AI explanation about this
                            diagram...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Q&A Modal */}
      {showQaModal && (
        <div className="qa-modal-overlay">
          <div className="qa-modal">
            <div className="qa-header">
              <div className="qa-robot">
                <div className="qa-robot-head">
                  <div className="qa-robot-eyes">
                    <div className="qa-eye"></div>
                    <div className="qa-eye"></div>
                  </div>
                  <div className="qa-robot-mouth"></div>
                </div>
              </div>
              <h3>❓ Question & Answer</h3>
            </div>

            <div className="qa-content">
              <p className="qa-prompt">{qaPrompt}</p>

              <div className="qa-input-group">
                <div className="input-container">
                  <input
                    type="text"
                    value={qaResponse}
                    onChange={(e) => setQaResponse(e.target.value)}
                    placeholder={voicePlaceholder}
                    className="qa-input"
                    onKeyPress={(e) => e.key === "Enter" && submitQAResponse()}
                    autoFocus
                  />
                  {isVoiceSupported && (
                    <button
                      onClick={
                        isListening
                          ? stopVoiceRecognition
                          : startVoiceRecognition
                      }
                      className={`voice-btn ${isListening ? "listening" : ""}`}
                      title={
                        isListening ? "Stop listening" : "Enable voice input"
                      }
                    >
                      <div className="voice-icon">
                        {isListening ? (
                          <div className="listening-animation">
                            <div className="pulse-ring"></div>
                            <div className="pulse-ring"></div>
                            <div className="pulse-ring"></div>
                          </div>
                        ) : (
                          <span>🎙️</span>
                        )}
                      </div>
                    </button>
                  )}
                </div>
                <button onClick={submitQAResponse} className="qa-submit-btn">
                  Send
                </button>
              </div>

              {!isVoiceSupported && (
                <div className="voice-not-supported">
                  <span>
                    🎙️ Voice recognition not supported in this browser
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowQaModal(false)}
              className="qa-cancel-btn"
            >
              Skip Question
            </button>
          </div>
        </div>
      )}

      {/* NEW: Interactive Diagram */}
      {showInteractiveDiagram && (
        <InteractiveDiagram
          isOpen={showInteractiveDiagram}
          onClose={closeInteractiveDiagram}
          imageUrl={
            diagramImageUrl ||
            `${API_BASE_URL}${API_ENDPOINT}/diagram-image/image1.png`
          }
          labels={diagramLabels}
          onLabelClick={handleLabelClick}
          currentExplanation={currentExplanation}
          isExplaining={isExplaining}
          transcript={backendTranscript?.transcript || []}
          interactiveTranscript={interactiveTranscript}
        />
      )}
    </div>
  );
};

export default PhysicsWavesLevel1;
