import React, { useState, useEffect } from "react";
import "./ReplySection.css";

interface Reply {
  id: string;
  content: string;
  comment_id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  image_url?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

interface ReplySectionProps {
  commentId: string;
  onReplyAdded: () => void;
}

const ReplySection: React.FC<ReplySectionProps> = ({
  commentId,
  onReplyAdded,
}) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);

  const token = localStorage.getItem("auth_token");

  useEffect(() => {
    console.log("ReplySection mounted for commentId:", commentId);
    fetchReplies();
  }, [commentId]);

  const fetchReplies = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/connection/comments/${commentId}/replies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies(data);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newReply.trim()) {
      setError("Please enter a reply");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("content", newReply.trim());
      formData.append("comment_id", commentId);

      if (image) {
        formData.append("image", image);
      }

      const response = await fetch("http://localhost:8000/connection/replies", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setNewReply("");
        setImage(null);
        setImagePreview(null);
        setShowReplyForm(false);
        fetchReplies();
        onReplyAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create reply");
      }
    } catch (error) {
      console.error("Error creating reply:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (
    replyId: string,
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
          reply_id: replyId,
          vote_type: voteType,
        }),
      });

      if (response.ok) {
        fetchReplies();
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
    <div className="reply-section">
      <div className="reply-header">
        <h5>Replies ({replies.length})</h5>
        <button
          className="add-reply-btn"
          onClick={() => setShowReplyForm(!showReplyForm)}
        >
          {showReplyForm ? "Cancel" : "Reply"}
        </button>
      </div>

      {showReplyForm && (
        <form onSubmit={handleSubmitReply} className="reply-form">
          <div className="form-group">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Write your reply..."
              rows={2}
              maxLength={300}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reply-image">Image (optional, max 10MB)</label>
            <input
              type="file"
              id="reply-image"
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
              {loading ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </form>
      )}

      <div className="replies-list">
        {replies.length === 0 ? (
          <p className="no-replies">No replies yet. Be the first to reply!</p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="reply-card">
              <div className="reply-header">
                <div className="author-info">
                  <div className="author-avatar">
                    {reply.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="author-details">
                    <span className="author-name">{reply.author_name}</span>
                    <span className="author-username">
                      @{reply.author_username}
                    </span>
                    <span className="reply-date">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="reply-content">
                <p>{reply.content}</p>

                {reply.image_url && (
                  <div className="reply-image">
                    <img
                      src={`http://localhost:8000${reply.image_url}`}
                      alt="Reply image"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="reply-actions">
                <button
                  className="vote-btn upvote"
                  onClick={() => handleVote(reply.id, "upvote")}
                  title="Upvote"
                >
                  <span className="vote-icon">👍</span>
                  <span className="vote-count">{reply.upvotes}</span>
                </button>

                <button
                  className="vote-btn downvote"
                  onClick={() => handleVote(reply.id, "downvote")}
                  title="Downvote"
                >
                  <span className="vote-icon">👎</span>
                  <span className="vote-count">{reply.downvotes}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReplySection;
