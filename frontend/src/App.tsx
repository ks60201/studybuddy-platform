import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "./config";
import "./styles/visual-polish.css";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import StudentConnect from "./components/StudentConnect";
import English from "./classes/Class7/English";
import Mathematics from "./classes/Class7/Mathematics";
import Science from "./classes/Class7/Science";
import Computing from "./classes/Class7/Computing";
import Geography from "./classes/Class7/Geography";
import History from "./classes/Class7/History";
import Languages from "./classes/Class7/Languages";
import PhysicalEducation from "./classes/Class7/PhysicalEducation";
import Biology from "./classes/Class7/Science/Biology";
import Physics from "./classes/Class7/Science/Physics";
import Chemistry from "./classes/Class7/Science/Chemistry";
import StructureAndFunction from "./classes/Class7/Science/Biology/StructureAndFunction";
import MaterialCyclesAndEnergy from "./classes/Class7/Science/Biology/MaterialCyclesAndEnergy";
import InteractionsAndInterdependencies from "./classes/Class7/Science/Biology/InteractionsAndInterdependencies";
import GeneticsAndEvolution from "./classes/Class7/Science/Biology/GeneticsAndEvolution";
import ParticulateNatureOfMatter from "./classes/Class7/Science/Chemistry/ParticulateNatureOfMatter";
import AtomsElementsCompounds from "./classes/Class7/Science/Chemistry/AtomsElementsCompounds";
import PureAndImpureSubstances from "./classes/Class7/Science/Chemistry/PureAndImpureSubstances";
import ChemicalReactions from "./classes/Class7/Science/Chemistry/ChemicalReactions";
import Energetics from "./classes/Class7/Science/Chemistry/Energetics";
import PeriodicTable from "./classes/Class7/Science/Chemistry/PeriodicTable";
import Materials from "./classes/Class7/Science/Chemistry/Materials";
import EarthAndAtmosphere from "./classes/Class7/Science/Chemistry/EarthAndAtmosphere";
import Energy from "./classes/Class7/Science/Physics/Energy";
import MotionAndForces from "./classes/Class7/Science/Physics/MotionAndForces";
import Waves from "./classes/Class7/Science/Physics/Waves";
import ElectricityAndElectromagnetism from "./classes/Class7/Science/Physics/ElectricityAndElectromagnetism";
import Matter from "./classes/Class7/Science/Physics/Matter";
import SpacePhysics from "./classes/Class7/Science/Physics/SpacePhysics";
import PhysicsWavesLevel1 from "./classes/Class7/Science/Physics/Waves/Level1";
import FlashcardPage from "./classes/Class7/Science/Physics/Waves/Level1/FlashcardPage";
import QuizPage from "./classes/Class7/Science/Physics/Waves/Level1/QuizPage";
import Algebra from "./classes/Class7/Mathematics/Algebra";
import AlgebraLevel1 from "./classes/Class7/Mathematics/Algebra/Level1";
import AlgebraFlashcardPage from "./classes/Class7/Mathematics/Algebra/Level1/FlashcardPage";
import AlgebraQuizPage from "./classes/Class7/Mathematics/Algebra/Level1/QuizPage";
import AiDoubtSolverChatbox from "./components/AiDoubtSolverChatbox";
import RevisionBook from "./components/RevisionBook";
import NotesPage from "./components/NotesPage";
import "./App.css";

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            throw new Error("Invalid token");
          }
        })
        .then((userData) => {
          setUser(userData);
        })
        .catch((err) => {
          console.error("Failed to get user data:", err);
          localStorage.removeItem(AUTH_TOKEN_KEY);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={<LoginForm onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/register"
            element={<RegisterForm onRegisterSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/ai-teacher"
            element={
              <div className="page-container ai-teacher-list">
                <h1 className="ai-teacher-title">AI Interactive Teacher</h1>
                <p className="ai-teacher-subtitle">
                  Select your class to get started
                </p>
                <div className="class-list-grid">
                  {Array.from({ length: 13 }, (_, i) => (
                    <a
                      key={i + 1}
                      href={i + 1 === 7 ? "/ai-teacher/class7" : `#`}
                      className="class-card"
                      onClick={(e) => {
                        if (i + 1 === 7) return;
                        e.preventDefault();
                        alert(`Class ${i + 1} selected!`);
                      }}
                    >
                      <span className="class-label">Class {i + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            }
          />
          <Route
            path="/ai-teacher/class7"
            element={
              <div className="page-container ai-teacher-list">
                <h1 className="ai-teacher-title">Class 7 Subjects</h1>
                <p className="ai-teacher-subtitle">
                  Select a subject to explore
                </p>
                <div className="class-list-grid">
                  <a href="/ai-teacher/class7/english" className="class-card">
                    <span className="class-label">English</span>
                  </a>
                  <a
                    href="/ai-teacher/class7/mathematics"
                    className="class-card"
                  >
                    <span className="class-label">Mathematics</span>
                  </a>
                  <a href="/ai-teacher/class7/science" className="class-card">
                    <span className="class-label">Science</span>
                  </a>
                  <a href="/ai-teacher/class7/computing" className="class-card">
                    <span className="class-label">Computing</span>
                  </a>
                  <a href="/ai-teacher/class7/geography" className="class-card">
                    <span className="class-label">Geography</span>
                  </a>
                  <a href="/ai-teacher/class7/history" className="class-card">
                    <span className="class-label">History</span>
                  </a>
                  <a href="/ai-teacher/class7/languages" className="class-card">
                    <span className="class-label">Languages</span>
                  </a>
                  <a
                    href="/ai-teacher/class7/physical-education"
                    className="class-card"
                  >
                    <span className="class-label">Physical Education</span>
                  </a>
                </div>
              </div>
            }
          />
          <Route path="/ai-teacher/class7/english" element={<English />} />
          <Route
            path="/ai-teacher/class7/mathematics"
            element={<Mathematics />}
          />
          <Route path="/ai-teacher/class7/science" element={<Science />} />
          <Route path="/ai-teacher/class7/computing" element={<Computing />} />
          <Route path="/ai-teacher/class7/geography" element={<Geography />} />
          <Route path="/ai-teacher/class7/history" element={<History />} />
          <Route path="/ai-teacher/class7/languages" element={<Languages />} />
          <Route
            path="/ai-teacher/class7/physical-education"
            element={<PhysicalEducation />}
          />
          <Route
            path="/ai-teacher/class7/science/biology"
            element={<Biology />}
          />
          <Route
            path="/ai-teacher/class7/science/physics"
            element={<Physics />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry"
            element={<Chemistry />}
          />
          <Route
            path="/ai-teacher/class7/science/biology/structure-and-function"
            element={<StructureAndFunction />}
          />
          <Route
            path="/ai-teacher/class7/science/biology/material-cycles-and-energy"
            element={<MaterialCyclesAndEnergy />}
          />
          <Route
            path="/ai-teacher/class7/science/biology/interactions-and-interdependencies"
            element={<InteractionsAndInterdependencies />}
          />
          <Route
            path="/ai-teacher/class7/science/biology/genetics-and-evolution"
            element={<GeneticsAndEvolution />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/particulate-nature-of-matter"
            element={<ParticulateNatureOfMatter />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/atoms-elements-compounds"
            element={<AtomsElementsCompounds />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/pure-and-impure-substances"
            element={<PureAndImpureSubstances />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/chemical-reactions"
            element={<ChemicalReactions />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/energetics"
            element={<Energetics />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/periodic-table"
            element={<PeriodicTable />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/materials"
            element={<Materials />}
          />
          <Route
            path="/ai-teacher/class7/science/chemistry/earth-and-atmosphere"
            element={<EarthAndAtmosphere />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/energy"
            element={<Energy />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/motion-and-forces"
            element={<MotionAndForces />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/waves"
            element={<Waves />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/electricity-and-electromagnetism"
            element={<ElectricityAndElectromagnetism />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/matter"
            element={<Matter />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/space-physics"
            element={<SpacePhysics />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/waves/level1"
            element={<PhysicsWavesLevel1 />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/waves/level1/flashcards"
            element={<FlashcardPage />}
          />
          <Route
            path="/ai-teacher/class7/science/physics/waves/level1/quiz"
            element={<QuizPage />}
          />
          <Route
            path="/ai-teacher/class7/mathematics/algebra"
            element={<Algebra />}
          />
          <Route
            path="/ai-teacher/class7/mathematics/algebra/level1"
            element={<AlgebraLevel1 />}
          />
          <Route
            path="/ai-teacher/class7/mathematics/algebra/level1/flashcards"
            element={<AlgebraFlashcardPage />}
          />
          <Route
            path="/ai-teacher/class7/mathematics/algebra/level1/quiz"
            element={<AlgebraQuizPage />}
          />
          <Route
            path="/doubt-solver"
            element={
              <div className="page-container">
                <h1>AI Doubt Solver</h1>
                <p>Coming soon...</p>
              </div>
            }
          />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/revision-cards" element={<RevisionBook />} />
          <Route
            path="/ai-quiz"
            element={
              <div className="page-container">
                <h1>AI Quiz with Best Explanations</h1>
                <p>Coming soon...</p>
              </div>
            }
          />
          <Route
            path="/student-connect"
            element={<StudentConnect user={user} />}
          />
          <Route path="/ai-doubt-solver" element={<AiDoubtSolverChatbox />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
