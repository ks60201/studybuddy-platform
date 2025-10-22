import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  FileText,
  LogIn,
  UserPlus,
  LogOut,
  Brain,
  StickyNote,
  Sparkles,
  Zap,
  Crown,
} from "lucide-react";
import { AUTH_TOKEN_KEY } from "../config";

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar = ({ user, onLogout }: NavbarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    onLogout();
    navigate("/");
  };

  return (
    <nav className="navbar neo-navbar">
      <div className="navbar-glow" />
      <div className="navbar-container">
        <Link to="/" className="navbar-brand neo-brand">
          <div className="brand-mark">
            <img src="/logo.PNG" alt="Study Buddy" className="navbar-logo" />
            <div className="brand-glow" />
          </div>
          <div className="brand-text">
            <span className="brand-name"></span>
            <span className="brand-tag"></span>
          </div>
        </Link>

        <div className="navbar-menu neo-menu">
          <Link to="/ai-teacher" className="navbar-link neo-link">
            <Crown size={18} />
            <span>AI Teacher</span>
          </Link>
          <Link to="/ai-doubt-solver" className="navbar-link neo-link">
            <Brain size={18} />
            <span>Doubt Solver</span>
          </Link>
          <Link to="/notes" className="navbar-link neo-link">
            <StickyNote size={18} />
            <span>Notes</span>
          </Link>
          <Link to="/revision-cards" className="navbar-link neo-link">
            <FileText size={18} />
            <span>Revision</span>
          </Link>
          <Link to="/student-connect" className="navbar-link neo-link">
            <Users size={18} />
            <span>Connect</span>
          </Link>
        </div>

        <div className="navbar-auth neo-auth">
          {user ? (
            <div className="user-info neo-user">
              <div className="user-avatar" aria-hidden>
                {String(user.username || "")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="user-details">
                <span className="username">{user.username}</span>
                <span className="school-name">{user.school_name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="auth-btn logout-btn neo-btn"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <Link to="/login" className="auth-btn login-btn neo-btn">
                <LogIn size={16} />
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                className="auth-btn register-btn neo-btn primary"
              >
                <Sparkles size={16} />
                <span>Join Now</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
