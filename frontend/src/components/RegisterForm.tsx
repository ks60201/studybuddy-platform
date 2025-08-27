import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Building,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import styles from "./RegisterForm.module.css";

interface RegisterFormProps {
  onRegisterSuccess?: (userData: any) => void;
}

const RegisterForm = ({ onRegisterSuccess }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    country: "",
    school_name: "",
    grade: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value =
      e.target.name === "grade" ? parseInt(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/login");
        if (onRegisterSuccess) {
          onRegisterSuccess(data);
        }
      } else {
        setError(data.detail || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.container}>
        <div className={styles.graphicSide}>
          <h1>Join Our Community of Learners!</h1>
          <p>
            Create your account to unlock a smarter way to study. Let's get
            started on your path to success.
          </p>
        </div>
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <h2>Create Account</h2>
            <p>Fill in the details below to start your journey.</p>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <div className={styles.inputWrapper}>
                  <User className={styles.icon} size={20} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="e.g. studybuddy123"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <div className={styles.inputWrapper}>
                  <User className={styles.icon} size={20} />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.icon} size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Country</label>
                <div className={styles.inputWrapper}>
                  <Globe className={styles.icon} size={20} />
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="Your Country"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>School Name</label>
                <div className={styles.inputWrapper}>
                  <Building className={styles.icon} size={20} />
                  <input
                    type="text"
                    name="school_name"
                    value={formData.school_name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                    placeholder="e.g. MIT"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Grade</label>
                <div className={styles.inputWrapper}>
                  <GraduationCap className={styles.icon} size={20} />
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  >
                    <option value="">Select Grade</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Grade {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.icon} size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight size={20} />
                </>
              )}
            </button>

            <p className={styles.redirectText}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={styles.redirectLink}
              >
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
