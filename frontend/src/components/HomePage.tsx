import { Link } from "react-router-dom";
import {
  Brain,
  Users,
  ArrowRight,
  GraduationCap,
  Rocket,
  ChevronRight,
  Play,
  Layers,
  Cpu,
  Database,
  Network,
  Code,
  BarChart3,
  Crown,
  Gem,
  Flame,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const HomePage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const starsRef = useRef<
    Array<{ x: number; y: number; z: number; r: number }>
  >([]);
  const ctaPrimaryRef = useRef<HTMLAnchorElement | null>(null);
  const ctaSecondaryRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll(".floating-card");
      const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 25;

      setMousePosition({ x: e.pageX, y: e.pageY });

      cards.forEach((card: Element) => {
        const cardElement = card as HTMLElement;
        cardElement.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
      });

      // Magnetic CTA buttons
      const applyMagnet = (el: HTMLAnchorElement | null) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) * 0.12;
        const dy = (e.clientY - centerY) * 0.12;
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      };
      applyMagnet(ctaPrimaryRef.current);
      applyMagnet(ctaSecondaryRef.current);
    };

    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Canvas starfield background with subtle parallax
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize stars once
    if (starsRef.current.length === 0) {
      const starCount = 140;
      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          z: Math.random() * 0.9 + 0.1,
          r: Math.random() * 1.3 + 0.3,
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.globalAlpha = 0.85;
      const mx = mousePosition.x - window.innerWidth / 2;
      const my = mousePosition.y - window.innerHeight / 2;
      for (const s of starsRef.current) {
        const dx = mx * 0.0008 * s.z;
        const dy = my * 0.0008 * s.z;
        const x = s.x - dx * window.innerWidth;
        const y = s.y - dy * window.innerHeight;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * s.z})`;
        ctx.arc(x, y, s.r * (0.8 + s.z * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mousePosition.x, mousePosition.y]);

  return (
    <div className="homepage">
      <div
        className="cursor-glow"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
        }}
      />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <canvas ref={starCanvasRef} className="starfield" />
          <div className="gradient-sphere"></div>
          <div className="gradient-sphere-2"></div>
          <div className="mesh-grid"></div>
          <div className="animated-circles">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="circle"></div>
            ))}
          </div>
        </div>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <div className="badge-icon">
                <Crown className="atom-icon" />
                <div className="atom-orbit"></div>
              </div>
              <span>🚀 Revolutionary AI Education Platform</span>
            </div>
            <h1 className="hero-title">
              Transform Your
              <div className="gradient-text-wrapper">
                <span className="gradient-text">Learning Experience</span>
                <div className="text-decoration"></div>
              </div>
              <br />
              <span className="hero-subtitle-small">Beyond Imagination</span>
            </h1>
            <p className="hero-subtitle">
              Experience the future of education with our cutting-edge AI
              technology. Personalized learning paths, interactive content, and
              intelligent tutoring that adapts to your unique learning style and
              pace.
            </p>
            <div className="hero-cta">
              <Link
                to="/register"
                ref={ctaPrimaryRef}
                className="btn-primary cta-primary hero-cta-primary"
              >
                <span>Start Your Journey</span>
                <Rocket className="cta-icon" />
                <div className="button-glow"></div>
              </Link>
              <Link
                to="/ai-teacher"
                ref={ctaSecondaryRef}
                className="btn-secondary cta-secondary hero-cta-secondary"
              >
                <Play className="cta-icon" />
                <span>Explore AI Teacher</span>
                <ChevronRight className="cta-arrow" />
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-circle">
                  <span className="stat-number">50K+</span>
                  <svg className="stat-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" />
                  </svg>
                </div>
                <span className="stat-label">Active Learners</span>
              </div>
              <div className="stat">
                <div className="stat-circle">
                  <span className="stat-number">100+</span>
                  <svg className="stat-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" />
                  </svg>
                </div>
                <span className="stat-label">Countries</span>
              </div>
              <div className="stat">
                <div className="stat-circle">
                  <span className="stat-number">95%</span>
                  <svg className="stat-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" />
                  </svg>
                </div>
                <span className="stat-label">Success Rate</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-cards-container">
              <div className="floating-card card-1">
                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <Cpu className="card-icon" />
                    <div className="icon-particles">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="particle"></div>
                      ))}
                    </div>
                  </div>
                  <span>AI-Powered Learning</span>
                  <p>Intelligent Adaptation</p>
                </div>
                <div className="card-glow"></div>
                <div className="card-border"></div>
              </div>
              <div className="floating-card card-2">
                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <Network className="card-icon" />
                    <div className="icon-particles">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="particle"></div>
                      ))}
                    </div>
                  </div>
                  <span>Global Community</span>
                  <p>Learn Together</p>
                </div>
                <div className="card-glow"></div>
                <div className="card-border"></div>
              </div>
              <div className="floating-card card-3">
                <div className="card-content">
                  <div className="card-icon-wrapper">
                    <Gem className="card-icon" />
                    <div className="icon-particles">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="particle"></div>
                      ))}
                    </div>
                  </div>
                  <span>Premium Experience</span>
                  <p>Excellence Delivered</p>
                </div>
                <div className="card-glow"></div>
                <div className="card-border"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="features"
        style={{ "--scroll-position": scrollPosition } as any}
      >
        <div className="features-background">
          <div className="features-grid-pattern"></div>
          <div className="features-glow"></div>
        </div>

        <div className="container">
          <div className="section-header">
            <div className="section-icon-wrapper">
              <Flame className="section-icon" />
              <div className="icon-ring"></div>
            </div>
            <h2>Revolutionary Learning Features</h2>
            <p>
              Experience the next generation of educational technology that
              transforms how you learn
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: Cpu,
                title: "Neural AI Teacher",
                description:
                  "Advanced artificial intelligence that creates personalized learning experiences tailored to your unique needs",
                features: [
                  "Adaptive curriculum design",
                  "Real-time performance analysis",
                  "Personalized learning paths",
                  "Intelligent progress tracking",
                ],
                link: "/ai-teacher",
                linkText: "Start Learning",
              },
              {
                icon: Database,
                title: "Smart Problem Solver",
                description:
                  "Revolutionary AI that breaks down complex problems into understandable steps with visual explanations",
                features: [
                  "Multi-step solution breakdown",
                  "Interactive visual explanations",
                  "Step-by-step guidance",
                  "Instant feedback system",
                ],
                link: "/doubt-solver",
                linkText: "Solve Problems",
              },
              {
                icon: Layers,
                title: "Memory Enhancement",
                description:
                  "Cutting-edge technology that optimizes your learning retention through scientifically-proven methods",
                features: [
                  "Spaced repetition algorithms",
                  "Memory palace techniques",
                  "Knowledge synthesis",
                  "Retention optimization",
                ],
                link: "/revision-cards",
                linkText: "Enhance Memory",
              },
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  <feature.icon className="feature-icon" />
                  <div className="feature-icon-bg"></div>
                </div>
                <div className="feature-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <ul className="feature-list">
                    {feature.features.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <Link
                    to={feature.link}
                    className="btn-secondary feature-link"
                  >
                    {feature.linkText}
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="feature-decoration"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {[
              {
                icon: BarChart3,
                title: "Performance Boost",
                number: "47%",
                description: "Average grade improvement",
              },
              {
                icon: Crown,
                title: "Success Rate",
                number: "98%",
                description: "Learning goals achieved",
              },
              {
                icon: Network,
                title: "Global Reach",
                number: "150+",
                description: "Countries connected",
              },
            ].map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon-wrapper">
                  <stat.icon className="stat-icon" />
                  <div className="stat-icon-ring"></div>
                </div>
                <div className="stat-info">
                  <h4>{stat.title}</h4>
                  <div className="stat-number-wrapper">
                    <span className="stat-number">{stat.number}</span>
                    <div className="number-decoration"></div>
                  </div>
                  <p>{stat.description}</p>
                </div>
                <div className="stat-background"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-background">
          <div className="cta-shapes">
            <div className="cta-shape shape-1">
              <div className="shape-content">
                <Brain className="shape-icon" />
                <div className="shape-stats">
                  <span className="shape-number">24/7</span>
                  <span className="shape-text">AI Support</span>
                </div>
              </div>
            </div>
            <div className="cta-shape shape-2">
              <div className="shape-content">
                <Users className="shape-icon" />
                <div className="shape-stats">
                  <span className="shape-number">50K+</span>
                  <span className="shape-text">Students</span>
                </div>
              </div>
            </div>
            <div className="cta-shape shape-3">
              <div className="shape-content">
                <GraduationCap className="shape-icon" />
                <div className="shape-stats">
                  <span className="shape-number">95%</span>
                  <span className="shape-text">Success</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="cta-content">
            <div className="cta-icon-wrapper">
              <Rocket className="cta-icon" />
              <div className="icon-trails">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="trail"></div>
                ))}
              </div>
            </div>
            <h2>Ready to Transform Your Future?</h2>
            <p>
              Join millions of learners worldwide who have revolutionized their
              education. Your journey to academic excellence and personal growth
              starts here.
            </p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-primary cta-primary">
                <span>Launch Your Success</span>
                <div className="button-particles">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="particle"></div>
                  ))}
                </div>
              </Link>
              <Link to="/login" className="btn-secondary cta-secondary">
                <span>Continue Learning</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
