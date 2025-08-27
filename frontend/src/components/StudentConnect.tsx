import React, { useState, useEffect } from "react";
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

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  useEffect(() => {
    fetchPosts();
    fetchSchools();
  }, [selectedSchool, selectedGrade, sortBy, filterBy]);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [selectedSchool, selectedGrade, sortBy, filterBy]);

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
    <div className="student-connect">
      <div className="header">
        <h1>Student Connect</h1>
        <p>Connect with your peers and share your problems</p>
      </div>

      <div className="controls">
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="school-filter">School:</label>
            <select
              id="school-filter"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Schools</option>
              {user &&
                user.school_name &&
                !schools.includes(user.school_name) && (
                  <option value={user.school_name}>
                    My School ({user.school_name})
                  </option>
                )}
              {schools.map((school) => (
                <option key={school} value={school}>
                  {user && user.school_name === school
                    ? `My School (${school})`
                    : school}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="grade-filter">Class:</label>
            <select
              id="grade-filter"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Classes</option>
              <option value="your class">
                Your Class (Grade {user?.grade || "N/A"})
              </option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Sort by:</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_voted">Most Voted</option>
              <option value="most_commented">Most Commented</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="content-filter">Content:</label>
            <select
              id="content-filter"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="filter-select"
            >
              <option value="all">All Posts</option>
              <option value="with_images">With Images</option>
              <option value="without_images">Without Images</option>
            </select>
          </div>
        </div>

        <button
          className="create-post-btn"
          onClick={() => setShowCreatePost(true)}
        >
          + Create New Post
        </button>
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
            <p>
              No posts found matching your filters. Be the first to create a
              post!
            </p>
          </div>
        ) : (
          <>
            <div className="posts-count">
              Showing {startIndex}-{endIndex} of {allPosts.length} posts
            </div>

            <div className="posts-grid">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={handleVote}
                  onCommentAdded={fetchPosts}
                  onPostClick={handlePostClick}
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
  );
};

export default StudentConnect;
