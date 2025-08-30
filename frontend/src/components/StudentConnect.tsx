import React, { useState, useEffect, useRef } from "react";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import PostDetail from "./PostDetail";
import { AUTH_TOKEN_KEY } from "../config";
import "./StudentConnect.css";

interface Post {
  id: string;
  title: string;
  description: string;
  school_name: string;
  author_id: string;
  author_name: string;
  author_username: string;
  image_url?: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

type SortOption = "newest" | "oldest" | "most_voted" | "most_commented";
type FilterOption = "all" | "with_images" | "without_images" | "your_class";

const POSTS_PER_PAGE = 10;

export type StudentConnectProps = {
  user: any;
};

const StudentConnect: React.FC<StudentConnectProps> = ({ user }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [activeSchools, setActiveSchools] = useState<
    { name: string; postCount: number }[]
  >([]);
  // const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // Disabled for performance
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  useEffect(() => {
    fetchPosts();
    fetchSchools();
    fetchSidebarData();
  }, [selectedSchool, selectedGrade, sortBy, filterBy]);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [selectedSchool, selectedGrade, sortBy, filterBy]);

  // Mouse tracking disabled for better scroll performance
  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     if (containerRef.current) {
  //       const rect = containerRef.current.getBoundingClientRect();
  //       setMousePosition({
  //         x: (e.clientX - rect.left) / rect.width,
  //         y: (e.clientY - rect.top) / rect.height,
  //       });
  //     }
  //   };

  //   const container = containerRef.current;
  //   if (container) {
  //     container.addEventListener("mousemove", handleMouseMove);
  //     return () => container.removeEventListener("mousemove", handleMouseMove);
  //   }
  // }, []);

  // AI Helper auto-show
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allPosts.length === 0) {
        setShowAIHelper(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [allPosts]);

  // Typing indicator simulation (triggers randomly)
  useEffect(() => {
    const randomTyping = () => {
      if (Math.random() > 0.7) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
      }
    };

    const interval = setInterval(randomTyping, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      let url = "http://localhost:8000/connection/posts";
      const params = new URLSearchParams();

      if (selectedSchool !== "all") {
        params.append("school_filter", selectedSchool);
      }

      if (selectedGrade !== "all") {
        params.append("grade_filter", selectedGrade);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredPosts = data;

        // Apply filters
        if (filterBy === "with_images") {
          filteredPosts = data.filter((post: Post) => post.image_url);
        } else if (filterBy === "without_images") {
          filteredPosts = data.filter((post: Post) => !post.image_url);
        }

        // Apply sorting
        filteredPosts.sort((a: Post, b: Post) => {
          switch (sortBy) {
            case "newest":
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
            case "oldest":
              return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
              );
            case "most_voted":
              return b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
            case "most_commented":
              return b.comment_count - a.comment_count;
            default:
              return 0;
          }
        });

        setAllPosts(filteredPosts);
        setPosts(filteredPosts.slice(0, POSTS_PER_PAGE));
      } else {
        console.error("Failed to fetch posts");
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await fetch("http://localhost:8000/connection/schools", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools);
      }
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchSidebarData = async () => {
    try {
      // Fetch all posts to calculate trending and recent
      const response = await fetch("http://localhost:8000/connection/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Get trending posts (most voted in last 7 days)
        const trending = data
          .filter((post: Post) => {
            const postDate = new Date(post.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return postDate > weekAgo;
          })
          .sort(
            (a: Post, b: Post) =>
              b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
          )
          .slice(0, 5);

        // Get recent posts (last 10)
        const recent = data
          .sort(
            (a: Post, b: Post) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5);

        // Calculate active schools
        const schoolCounts: { [key: string]: number } = {};
        data.forEach((post: Post) => {
          schoolCounts[post.school_name] =
            (schoolCounts[post.school_name] || 0) + 1;
        });

        const activeSchoolsList = Object.entries(schoolCounts)
          .map(([name, postCount]) => ({ name, postCount }))
          .sort((a, b) => b.postCount - a.postCount)
          .slice(0, 5);

        setTrendingPosts(trending);
        setRecentPosts(recent);
        setActiveSchools(activeSchoolsList);
      }
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
    }
  };

  const handlePostCreated = () => {
    setShowCreatePost(false);
    fetchPosts();
  };

  const handleVote = async (
    postId: string,
    voteType: "upvote" | "downvote"
  ) => {
    try {
      const response = await fetch("http://localhost:8000/connection/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          post_id: postId,
          vote_type: voteType,
        }),
      });

      if (response.ok) {
        // Refresh posts to get updated vote counts
        fetchPosts();
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
  };

  const handleBackToPosts = () => {
    setSelectedPostId(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    setPosts(allPosts.slice(startIndex, endIndex));
  };

  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * POSTS_PER_PAGE, allPosts.length);

  if (selectedPostId) {
    return (
      <PostDetail
        postId={selectedPostId}
        onBack={handleBackToPosts}
        onVote={handleVote}
      />
    );
  }

  if (loading) {
    return (
      <div className="student-connect">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="student-connect"
      ref={containerRef}
      // Mouse tracking disabled for performance
      // style={
      //   {
      //     "--mouse-x": mousePosition.x,
      //     "--mouse-y": mousePosition.y,
      //   } as React.CSSProperties
      // }
    >
      {/* Optimized Particles Background - Reduced count */}
      <div className="particles-container">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={
              {
                "--delay": `${i * 0.5}s`,
                "--duration": `${4 + i * 0.3}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* AI Smart Helper */}
      {showAIHelper && (
        <div className="ai-helper">
          <div className="ai-helper-content">
            <div className="ai-avatar">🤖</div>
            <div className="ai-message">
              <div className="ai-text">
                Hi! I'm your Study Buddy AI. I noticed you're browsing posts.
                Would you like me to suggest trending topics or help you create
                your first post?
              </div>
              <div className="ai-actions">
                <button
                  className="ai-btn"
                  onClick={() => setSortBy("most_voted")}
                >
                  🔥 Show Hot Topics
                </button>
                <button
                  className="ai-btn"
                  onClick={() => setShowCreatePost(true)}
                >
                  ✨ Create Post
                </button>
                <button
                  className="ai-close"
                  onClick={() => setShowAIHelper(false)}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Collaboration Indicator */}
      <div className="collaboration-indicator">
        <div className="collab-users">
          <div className="collab-user active">
            <div className="user-avatar">👨‍🎓</div>
            <span className="user-status">online</span>
          </div>
          <div className="collab-user">
            <div className="user-avatar">👩‍🎓</div>
            <span className="user-status">
              {isTyping ? "typing..." : "viewing"}
            </span>
          </div>
          <div className="collab-count">+{schools.length} more studying</div>
        </div>
      </div>

      <div className="header">
        <div className="header-content">
          <div className="header-icon">🌟</div>
          <h1>Student Connect</h1>
          <p>Connect, collaborate, and learn together with fellow students</p>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{allPosts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{schools.length}</span>
              <span className="stat-label">Schools</span>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="content-area">
          <div className="controls">
            <div className="controls-header">
              <h3>🔍 Discover Posts</h3>
              <button
                className="create-post-btn primary"
                onClick={() => setShowCreatePost(true)}
              >
                <span className="btn-icon">✨</span>
                Create Post
              </button>
            </div>

            <div className="filters-section">
              <div className="filter-group">
                <label htmlFor="school-filter">
                  <span className="label-icon">🏫</span>
                  School
                </label>
                <select
                  id="school-filter"
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">🌐 All Schools</option>
                  {user &&
                    user.school_name &&
                    !schools.includes(user.school_name) && (
                      <option value={user.school_name}>
                        🏠 My School ({user.school_name})
                      </option>
                    )}
                  {schools.map((school) => (
                    <option key={school} value={school}>
                      {user && user.school_name === school
                        ? `🏠 My School (${school})`
                        : `🏫 ${school}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="grade-filter">
                  <span className="label-icon">🎓</span>
                  Class
                </label>
                <select
                  id="grade-filter"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">📚 All Classes</option>
                  <option value="your class">
                    🎯 Your Class (Grade {user?.grade || "N/A"})
                  </option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-filter">
                  <span className="label-icon">⚡</span>
                  Sort by
                </label>
                <select
                  id="sort-filter"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="filter-select"
                >
                  <option value="newest">🆕 Newest First</option>
                  <option value="oldest">⏰ Oldest First</option>
                  <option value="most_voted">🔥 Most Voted</option>
                  <option value="most_commented">💬 Most Commented</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="content-filter">
                  <span className="label-icon">🎨</span>
                  Content
                </label>
                <select
                  id="content-filter"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  className="filter-select"
                >
                  <option value="all">📝 All Posts</option>
                  <option value="with_images">🖼️ With Images</option>
                  <option value="without_images">💭 Text Only</option>
                </select>
              </div>
            </div>
          </div>

          {showCreatePost && (
            <CreatePost
              onPostCreated={handlePostCreated}
              onCancel={() => setShowCreatePost(false)}
            />
          )}

          <div className="posts-container">
            {allPosts.length === 0 ? (
              <div className="no-posts">
                <div className="no-posts-icon">🌟</div>
                <h3>No posts yet!</h3>
                <p>
                  Be the first to start a conversation and help your fellow
                  students.
                </p>
                <button
                  className="create-first-post-btn"
                  onClick={() => setShowCreatePost(true)}
                >
                  <span className="btn-icon">✨</span>
                  Create the First Post
                </button>
              </div>
            ) : (
              <>
                <div className="posts-header">
                  <div className="posts-count">
                    <span className="count-icon">📊</span>
                    Showing{" "}
                    <strong>
                      {startIndex}-{endIndex}
                    </strong>{" "}
                    of <strong>{allPosts.length}</strong> posts
                  </div>
                  <div className="view-toggles">
                    <button
                      className={`view-toggle ${
                        viewMode === "grid" ? "active" : ""
                      }`}
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                    >
                      ⊞
                    </button>
                    <button
                      className={`view-toggle ${
                        viewMode === "list" ? "active" : ""
                      }`}
                      onClick={() => setViewMode("list")}
                      title="List View"
                    >
                      ☰
                    </button>
                  </div>
                </div>

                <div className={`posts-${viewMode}`}>
                  {posts.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onVote={handleVote}
                      onCommentAdded={fetchPosts}
                      onPostClick={handlePostClick}
                      animationDelay={index * 0.1}
                      viewMode={viewMode}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <div className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="pagination-buttons">
                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            className={`pagination-btn ${
                              page === currentPage ? "active" : ""
                            }`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reddit-style Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">🔥</span>
              Trending Posts
            </h3>
            <div className="sidebar-content">
              {trendingPosts.length > 0 ? (
                trendingPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="sidebar-post"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <div className="sidebar-post-rank">#{index + 1}</div>
                    <div className="sidebar-post-content">
                      <div className="sidebar-post-title">{post.title}</div>
                      <div className="sidebar-post-meta">
                        <span className="sidebar-votes">
                          🔼 {post.upvotes - post.downvotes}
                        </span>
                        <span className="sidebar-school">
                          {post.school_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sidebar-empty">No trending posts yet</div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">⚡</span>
              Recent Activity
            </h3>
            <div className="sidebar-content">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="sidebar-post"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <div className="sidebar-post-content">
                      <div className="sidebar-post-title">{post.title}</div>
                      <div className="sidebar-post-meta">
                        <span className="sidebar-time">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        <span className="sidebar-school">
                          {post.school_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sidebar-empty">No recent posts</div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">🏫</span>
              Active Schools
            </h3>
            <div className="sidebar-content">
              {activeSchools.length > 0 ? (
                activeSchools.map((school, index) => (
                  <div
                    key={school.name}
                    className="sidebar-school-item"
                    onClick={() => setSelectedSchool(school.name)}
                  >
                    <div className="school-rank">#{index + 1}</div>
                    <div className="school-info">
                      <div className="school-name">{school.name}</div>
                      <div className="school-posts">
                        {school.postCount} posts
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sidebar-empty">No schools active</div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">📊</span>
              Quick Stats
            </h3>
            <div className="sidebar-content">
              <div className="stat-row">
                <span className="stat-label">Total Posts</span>
                <span className="stat-value">{allPosts.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Active Schools</span>
                <span className="stat-value">{schools.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Your School</span>
                <span className="stat-value">{user?.school_name || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <span className="sidebar-icon">🎯</span>
              Quick Actions
            </h3>
            <div className="sidebar-content">
              <button
                className="quick-action-btn"
                onClick={() => setShowCreatePost(true)}
              >
                <span className="action-icon">✨</span>
                Create Post
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setSelectedSchool(user?.school_name || "all")}
              >
                <span className="action-icon">🏠</span>
                My School
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setSortBy("most_voted")}
              >
                <span className="action-icon">🔥</span>
                Hot Posts
              </button>
            </div>
          </div>
        </div>

        {/* Floating Action Bubbles */}
        <div className="floating-actions">
          <div
            className="floating-bubble"
            onClick={() => setShowCreatePost(true)}
          >
            <span className="bubble-icon">✨</span>
            <span className="bubble-label">Create</span>
          </div>
          <div
            className="floating-bubble"
            onClick={() => setSortBy("most_voted")}
          >
            <span className="bubble-icon">🔥</span>
            <span className="bubble-label">Hot</span>
          </div>
          <div
            className="floating-bubble"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            <span className="bubble-icon">
              {viewMode === "grid" ? "☰" : "⊞"}
            </span>
            <span className="bubble-label">View</span>
          </div>
        </div>

        {/* 3D Achievement Popup */}
        {allPosts.length > 0 && (
          <div className="achievement-popup">
            <div className="achievement-content">
              <div className="achievement-icon">🏆</div>
              <div className="achievement-text">
                <div className="achievement-title">Community Explorer!</div>
                <div className="achievement-desc">
                  You're browsing {allPosts.length} posts from {schools.length}{" "}
                  schools
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Mood Board */}
        <div className="mood-board">
          <div className="mood-title">📊 Community Pulse</div>
          <div className="mood-items">
            <div className="mood-item">
              <span className="mood-emoji">😊</span>
              <span className="mood-label">Happy</span>
              <div className="mood-bar" style={{ width: "75%" }}></div>
            </div>
            <div className="mood-item">
              <span className="mood-emoji">🤔</span>
              <span className="mood-label">Curious</span>
              <div className="mood-bar" style={{ width: "60%" }}></div>
            </div>
            <div className="mood-item">
              <span className="mood-emoji">💡</span>
              <span className="mood-label">Inspired</span>
              <div className="mood-bar" style={{ width: "80%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentConnect;
