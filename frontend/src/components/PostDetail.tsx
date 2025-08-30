import React, { useState, useEffect, useRef } from "react";
import CommentSection from "./CommentSection";
import "./PostDetail.css";

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

interface PostDetailProps {
  postId: string;
  onBack: () => void;
  onVote: (postId: string, voteType: "upvote" | "downvote") => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ postId, onBack, onVote }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [reactionAnimation, setReactionAnimation] = useState<string | null>(
    null
  );
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    console.log("PostDetail component mounted with postId:", postId);
    fetchPost();
  }, [postId]);

  // Reading progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        const scrollTop = window.pageYOffset;
        const scrollHeight = element.scrollHeight - window.innerHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Enhanced interactions
  const handleLike = () => {
    setIsLiked(!isLiked);
    setReactionAnimation("like");
    setTimeout(() => setReactionAnimation(null), 600);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    setReactionAnimation("bookmark");
    setTimeout(() => setReactionAnimation(null), 600);
  };

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setReactionAnimation("copy");
    setTimeout(() => setReactionAnimation(null), 600);
    setShowShareMenu(false);
  };

  const fetchPost = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/connection/posts/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPost(data);
        console.log("Post loaded successfully:", data);
      } else {
        setError("Failed to load post");
        console.error("Failed to load post");
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleVote = (voteType: "upvote" | "downvote") => {
    onVote(postId, voteType);
    // Refresh post data after voting
    fetchPost();
  };

  if (loading) {
    return (
      <div className="post-detail">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error || "Post not found"}</p>
          <button onClick={onBack} className="back-btn">
            ← Back to Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail" ref={contentRef}>
      {/* Reading Progress Bar */}
      <div className="reading-progress-container">
        <div
          className="reading-progress-bar"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Action Menu */}
      <div className="floating-action-menu">
        <button
          onClick={onBack}
          className="floating-btn back-floating"
          title="Back to Posts"
        >
          ←
        </button>
        <button
          onClick={handleLike}
          className={`floating-btn like-btn ${isLiked ? "liked" : ""}`}
          title={isLiked ? "Unlike" : "Like"}
        >
          {isLiked ? "❤️" : "🤍"}
        </button>
        <button
          onClick={handleBookmark}
          className={`floating-btn bookmark-btn ${
            isBookmarked ? "bookmarked" : ""
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
        >
          {isBookmarked ? "🔖" : "📖"}
        </button>
        <button
          onClick={handleShare}
          className="floating-btn share-btn"
          title="Share"
        >
          🔗
        </button>
      </div>

      {/* Share Menu */}
      {showShareMenu && (
        <div className="share-menu">
          <div className="share-menu-content">
            <button className="share-option" onClick={copyToClipboard}>
              <span className="share-icon">📋</span>
              Copy Link
            </button>
            <button className="share-option">
              <span className="share-icon">📱</span>
              Share on Social
            </button>
            <button className="share-option">
              <span className="share-icon">📧</span>
              Email
            </button>
          </div>
        </div>
      )}

      {/* Reaction Animation */}
      {reactionAnimation && (
        <div className={`reaction-animation ${reactionAnimation}`}>
          {reactionAnimation === "like" && "❤️"}
          {reactionAnimation === "bookmark" && "🔖"}
          {reactionAnimation === "copy" && "✨ Copied!"}
        </div>
      )}

      {/* Hero Header */}
      <div className="post-hero">
        <div className="hero-background">
          <div className="hero-particles">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="hero-particle" />
            ))}
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-breadcrumb">
            <span onClick={onBack} className="breadcrumb-link">
              Posts
            </span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Post Detail</span>
          </div>

          <div className="hero-author">
            <div className="author-avatar-large">
              {post.author_name.charAt(0).toUpperCase()}
              <div className="avatar-ring"></div>
            </div>
            <div className="author-info-detailed">
              <h1 className="author-name-large">{post.author_name}</h1>
              <p className="author-username-large">@{post.author_username}</p>
              <div className="author-meta">
                <span className="school-badge-hero">{post.school_name}</span>
                <span className="post-date-hero">
                  {formatDate(post.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="post-content-card">
        <div className="content-header">
          <h1 className="post-title-main">{post.title}</h1>
          <div className="content-meta">
            <div className="reading-time">
              <span className="meta-icon">⏱️</span>
              {Math.ceil(post.description.length / 200)} min read
            </div>
            <div className="engagement-preview">
              <span className="meta-icon">👁️</span>
              {post.upvotes + post.downvotes + 15} views
            </div>
          </div>
        </div>

        {post.image_url && (
          <div className="post-image-showcase">
            <img
              src={`http://localhost:8000${post.image_url}`}
              alt="Post image"
              className="post-image-main"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="image-overlay">
              <button className="image-expand-btn">🔍 View Full Size</button>
            </div>
          </div>
        )}

        <div className="post-content-text">
          <div className="content-body">
            {post.description.split("\n").map((paragraph, index) => (
              <p key={index} className="content-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Enhanced Actions */}
        <div className="post-actions-enhanced">
          <div className="action-section votes">
            <div className="vote-cluster">
              <button
                className={`vote-btn-enhanced upvote ${
                  reactionAnimation === "upvote" ? "animate" : ""
                }`}
                onClick={() => {
                  handleVote("upvote");
                  setReactionAnimation("upvote");
                  setTimeout(() => setReactionAnimation(null), 600);
                }}
              >
                <span className="vote-icon-enhanced">🔥</span>
                <span className="vote-label">Hot</span>
                <span className="vote-count-enhanced">{post.upvotes}</span>
              </button>
              <button
                className={`vote-btn-enhanced downvote ${
                  reactionAnimation === "downvote" ? "animate" : ""
                }`}
                onClick={() => {
                  handleVote("downvote");
                  setReactionAnimation("downvote");
                  setTimeout(() => setReactionAnimation(null), 600);
                }}
              >
                <span className="vote-icon-enhanced">❄️</span>
                <span className="vote-label">Cold</span>
                <span className="vote-count-enhanced">{post.downvotes}</span>
              </button>
            </div>
          </div>

          <div className="action-section engagement">
            <div className="engagement-stats">
              <div className="stat-item">
                <span className="stat-icon">💬</span>
                <span className="stat-count">{post.comment_count}</span>
                <span className="stat-label">Comments</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">❤️</span>
                <span className="stat-count">
                  {isLiked ? post.upvotes + 1 : post.upvotes}
                </span>
                <span className="stat-label">Likes</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔖</span>
                <span className="stat-count">{isBookmarked ? 1 : 0}</span>
                <span className="stat-label">Saved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section Enhanced */}
        <div className="comments-section-enhanced">
          <div className="comments-header">
            <h3 className="comments-title">
              <span className="comments-icon">💭</span>
              Discussion ({post.comment_count})
            </h3>
            <div className="comments-sort">
              <button className="sort-btn active">Latest</button>
              <button className="sort-btn">Popular</button>
              <button className="sort-btn">Oldest</button>
            </div>
          </div>
          <CommentSection postId={post.id} onCommentAdded={fetchPost} />
        </div>
      </div>

      {/* Related Posts Suggestion */}
      <div className="related-posts">
        <h3 className="related-title">
          <span className="related-icon">🔗</span>
          Continue Reading
        </h3>
        <div className="related-grid">
          <div className="related-card">
            <div className="related-image">📚</div>
            <h4>Similar Posts</h4>
            <p>Discover more content from {post.school_name}</p>
          </div>
          <div className="related-card">
            <div className="related-image">👥</div>
            <h4>Author's Posts</h4>
            <p>More from {post.author_name}</p>
          </div>
        </div>
      </div>

      {/* Floating Back to Top */}
      <button
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ opacity: readingProgress > 20 ? 1 : 0 }}
      >
        ↑
      </button>
    </div>
  );
};

export default PostDetail;
