import React, { useState } from "react";
import CommentSection from "./CommentSection";
import "./PostCard.css";

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

interface PostCardProps {
  post: Post;
  onVote: (postId: string, voteType: "upvote" | "downvote") => void;
  onCommentAdded: () => void;
  onPostClick: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onVote,
  onCommentAdded,
  onPostClick,
}) => {
  const [showComments, setShowComments] = useState(false);

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

  const handleVote = (voteType: "upvote" | "downvote") => {
    onVote(post.id, voteType);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handlePostClick = () => {
    onPostClick(post.id);
  };

  return (
    <div className="post-card">
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

      <div className="post-content" onClick={handlePostClick}>
        <h3 className="post-title">{post.title}</h3>
        <p className="post-description">
          {truncateText(post.description, 200)}
          {post.description.length > 200 && (
            <span className="read-more"> Read more...</span>
          )}
        </p>

        {post.image_url && (
          <div className="post-image-preview">
            <img
              src={`http://localhost:8000${post.image_url}`}
              alt="Post image"
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
            onClick={(e) => {
              e.stopPropagation();
              handleVote("upvote");
            }}
            title="Upvote"
          >
            <span className="vote-icon">👍</span>
            <span className="vote-count">{post.upvotes}</span>
          </button>

          <button
            className="vote-btn downvote"
            onClick={(e) => {
              e.stopPropagation();
              handleVote("downvote");
            }}
            title="Downvote"
          >
            <span className="vote-icon">👎</span>
            <span className="vote-count">{post.downvotes}</span>
          </button>
        </div>

        <div className="action-buttons">
          <button
            className="comment-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
          >
            <span className="comment-icon">💬</span>
            <span className="comment-count">
              {post.comment_count}{" "}
              {post.comment_count === 1 ? "Comment" : "Comments"}
            </span>
          </button>

          <button className="view-post-btn" onClick={handlePostClick}>
            <span className="view-icon">👁️</span>
            <span>View Full Post</span>
          </button>
        </div>
      </div>

      {showComments && (
        <CommentSection postId={post.id} onCommentAdded={onCommentAdded} />
      )}
    </div>
  );
};

export default PostCard;
