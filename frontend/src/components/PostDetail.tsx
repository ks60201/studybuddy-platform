import React, { useState, useEffect } from "react";
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

  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    console.log("PostDetail component mounted with postId:", postId);
    fetchPost();
  }, [postId]);

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
    <div className="post-detail">
      <div className="post-detail-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Posts
        </button>
        <h1>Post Details</h1>
      </div>

      <div className="post-detail-content">
        <div className="post-header">
          <div className="author-info">
            <div className="author-avatar">
              {post.author_name.charAt(0).toUpperCase()}
            </div>
            <div className="author-details">
              <span className="author-name">{post.author_name}</span>
              <span className="author-username">@{post.author_username}</span>
              <span className="post-date">{formatDate(post.created_at)}</span>
            </div>
          </div>
          <div className="school-badge">{post.school_name}</div>
        </div>

        <div className="post-body">
          <h2 className="post-title">{post.title}</h2>
          <p className="post-description">{post.description}</p>

          {post.image_url && (
            <div className="post-image-container">
              <img
                src={`http://localhost:8000${post.image_url}`}
                alt="Post image"
                className="post-image"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div className="post-actions">
          <div className="vote-section">
            <button
              className="vote-btn upvote"
              onClick={() => handleVote("upvote")}
              title="Upvote"
            >
              <span className="vote-icon">👍</span>
              <span className="vote-count">{post.upvotes}</span>
            </button>

            <button
              className="vote-btn downvote"
              onClick={() => handleVote("downvote")}
              title="Downvote"
            >
              <span className="vote-icon">👎</span>
              <span className="vote-count">{post.downvotes}</span>
            </button>
          </div>

          <div className="post-stats">
            <span className="comment-count">
              💬 {post.comment_count}{" "}
              {post.comment_count === 1 ? "Comment" : "Comments"}
            </span>
          </div>
        </div>

        <div className="comments-section">
          <CommentSection postId={post.id} onCommentAdded={fetchPost} />
        </div>
      </div>

      {/* Additional back button at the bottom for better UX */}
      <div className="bottom-back-section">
        <button onClick={onBack} className="back-btn bottom-back-btn">
          ← Back to All Posts
        </button>
      </div>
    </div>
  );
};

export default PostDetail;
