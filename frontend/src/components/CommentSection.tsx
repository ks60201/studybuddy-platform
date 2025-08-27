import React, { useState, useEffect } from "react";
import ReplySection from "./ReplySection";
import "./CommentSection.css";

interface Comment {
  id: string;
  content: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  image_url?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

interface CommentSectionProps {
  postId: string;
  onCommentAdded: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);

  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/connection/posts/${postId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched comments:", data);
        setComments(data);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      setImage(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      setError("Please enter a comment");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("content", newComment.trim());
      formData.append("post_id", postId);

      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(
        "http://localhost:8000/connection/comments",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData - browser will set it automatically with boundary
          },
          body: formData,
        }
      );

      if (response.ok) {
        setNewComment("");
        setImage(null);
        setImagePreview(null);
        setShowCommentForm(false);
        fetchComments();
        onCommentAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create comment");
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (
    commentId: string,
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
          comment_id: commentId,
          vote_type: voteType,
        }),
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="comment-section">
      <div className="comment-header">
        <h4>Comments ({comments.length})</h4>
        <button
          className="add-comment-btn"
          onClick={() => setShowCommentForm(!showCommentForm)}
        >
          {showCommentForm ? "Cancel" : "Add Comment"}
        </button>
      </div>

      {showCommentForm && (
        <form onSubmit={handleSubmitComment} className="comment-form">
          <div className="form-group">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              rows={3}
              maxLength={500}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="comment-image">Image (optional, max 10MB)</label>
            <input
              type="file"
              id="comment-image"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="remove-image-btn"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            console.log("Rendering comment:", comment.id);
            return (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <div className="author-info">
                    <div className="author-avatar">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-details">
                      <span className="author-name">{comment.author_name}</span>
                      <span className="author-username">
                        @{comment.author_username}
                      </span>
                      <span className="comment-date">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="comment-content">
                  <p>{comment.content}</p>

                  {comment.image_url && (
                    <div className="comment-image">
                      <img
                        src={`http://localhost:8000${comment.image_url}`}
                        alt="Comment image"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="comment-actions">
                  <div className="vote-actions">
                    <button
                      className="vote-btn upvote"
                      onClick={() => handleVote(comment.id, "upvote")}
                      title="Upvote"
                    >
                      <span className="vote-icon">👍</span>
                      <span className="vote-count">{comment.upvotes}</span>
                    </button>

                    <button
                      className="vote-btn downvote"
                      onClick={() => handleVote(comment.id, "downvote")}
                      title="Downvote"
                    >
                      <span className="vote-icon">👎</span>
                      <span className="vote-count">{comment.downvotes}</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    border: "2px solid red",
                    padding: "10px",
                    margin: "10px 0",
                  }}
                >
                  <ReplySection
                    commentId={comment.id}
                    onReplyAdded={fetchComments}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentSection;
