import { useState } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '../Services/api';
import { PostContext } from './post-context';


export function PostProvider({ children }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = async (category = 'all', sort = 'latest', q = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, sort });
      if (q && q.trim()) params.set('q', q.trim());
      const data = await apiRequest(`/posts?${params}`);
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPostDetail = async (postId) => {
    try {
      return await apiRequest(`/posts/${postId}`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const createPost = async (content, category, isAnonymous) => {
    if (!token) return { success: false, error: "You must be signed in to post." };
    try {
      const data = await apiRequest('/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, category, is_anonymous: isAnonymous })
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const reactPost = async (postId) => {
    if (!token) return { success: false, error: "You must be signed in to react." };
    try {
      const data = await apiRequest(`/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update state locally
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? { ...p, reactions_count: data.reactions_count, liked_by_me: data.liked }
            : p
        )
      );
      return { success: true, liked: data.liked, count: data.reactions_count };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const reportPost = async (postId, reason) => {
    if (!token) return { success: false, error: "You must be signed in to report content." };
    try {
      const data = await apiRequest(`/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      // Update state locally: set status to under_review or remove if flagged
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId ? { ...p, status: data.status } : p
        ).filter(p => p.status !== 'flagged')
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getComments = async (postId) => {
    try {
      return await apiRequest(`/posts/${postId}/comments`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const addComment = async (postId, content, isAnonymous) => {
    if (!token) return { success: false, error: "You must be signed in to comment." };
    try {
      const data = await apiRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, is_anonymous: isAnonymous })
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getAiInsight = async (postId) => {
    if (!token) return { success: false, error: "You must be signed in to fetch AI insight." };
    try {
      const data = await apiRequest(`/posts/${postId}/ai-insight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return { success: true, insight: data.insight };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deletePost = async (postId) => {
    if (!token) return { success: false, error: "You must be signed in to delete a post." };
    try {
      await apiRequest(`/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteComment = async (postId, commentId) => {
    if (!token) return { success: false, error: "You must be signed in to delete a comment." };
    try {
      await apiRequest(`/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const reportComment = async (postId, commentId, reason) => {
    if (!token) return { success: false, error: "You must be signed in to report content." };
    try {
      const data = await apiRequest(`/posts/${postId}/comments/${commentId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const val = {
    posts,
    loading,
    error,
    fetchPosts,
    getPostDetail,
    createPost,
    deletePost,
    reactPost,
    reportPost,
    getComments,
    addComment,
    deleteComment,
    reportComment,
    getAiInsight
  };

  return (
    <PostContext.Provider value={val}>
      {children}
    </PostContext.Provider>
  );
}
