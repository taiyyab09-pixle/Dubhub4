import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiVideo, FiCheck, FiPlay, FiTrash2, FiLoader } from 'react-icons/fi';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [pollingIds, setPollingIds] = useState(new Set());

  // Fetch videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  // Poll for dubbing progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (pollingIds.size > 0) {
        pollingIds.forEach(id => checkProgress(id));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingIds]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await uploadVideo(acceptedFiles[0]);
      }
    }
  });

  const uploadVideo = async (file) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || file.name);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percent);
        }
      });

      if (response.data.success) {
        alert('✅ Video uploaded successfully!');
        setTitle('');
        fetchVideos();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`❌ Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const requestDubbing = async (videoId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/dub/${videoId}`);
      if (response.data.success) {
        alert('🎯 Dubbing process started! This will take about 30 seconds.');
        setPollingIds(prev => new Set([...prev, videoId]));
        fetchVideos();
      }
    } catch (error) {
      alert('❌ Failed to start dubbing process');
    }
  };

  const checkProgress = async (videoId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/progress/${videoId}`);
      if (response.data.status === 'completed') {
        setPollingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        fetchVideos();
      }
    } catch (error) {
      console.error('Progress check error:', error);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/video/${videoId}`);
      if (response.data.success) {
        alert('✅ Video deleted successfully');
        fetchVideos();
      }
    } catch (error) {
      alert('❌ Failed to delete video');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded': return 'blue';
      case 'processing': return 'orange';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🎬 Video Dub Hub</h1>
          <p>Upload long videos and get automatic Hindi dubbing</p>
        </div>
      </header>

      <div className="container">
        {/* Upload Section */}
        <div className="upload-section">
          <h2>📤 Upload Your Video</h2>
          
          <div className="title-input">
            <input
              type="text"
              placeholder="Enter video title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            <FiUpload size={48} />
            <p>{isDragActive ? 'Drop the video here...' : 'Drag & drop a video file here, or click to select'}</p>
            <p className="file-info">Supports: MP4, AVI, MOV, MKV, WEBM (Max 2GB)</p>
          </div>

          {uploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p>Uploading: {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Video List */}
        <div className="videos-section">
          <h2>🎥 Your Videos ({videos.length})</h2>
          
          {videos.length === 0 ? (
            <div className="empty-state">
              <FiVideo size={64} />
              <p>No videos uploaded yet</p>
              <p>Upload your first video to get started!</p>
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => (
                <div key={video.id} className="video-card">
                  <div className="video-header">
                    <h3>{video.title}</h3>
                    <span className={`status-badge ${getStatusColor(video.status)}`}>
                      {video.status}
                    </span>
                  </div>
                  
                  <div className="video-info">
                    <p><strong>File:</strong> {video.originalName}</p>
                    <p><strong>Size:</strong> {formatFileSize(video.size)}</p>
                    <p><strong>Uploaded:</strong> {formatDate(video.uploadDate)}</p>
                    
                    {video.status === 'processing' && (
                      <div className="progress-info">
                        <FiLoader className="spinner" />
                        <span>Dubbing in progress: {video.progress}%</span>
                      </div>
                    )}
                    
                    {video.hindiDubbed && (
                      <p className="hindi-badge">
                        <FiCheck /> Hindi Dubbing Available
                      </p>
                    )}
                  </div>
                  
                  <div className="video-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.open(`${API_BASE_URL}/uploads/videos/${video.filename}`, '_blank')}
                    >
                      <FiPlay /> Play Original
                    </button>
                    
                    {video.status === 'uploaded' && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => requestDubbing(video.id)}
                      >
                        🎯 Dub to Hindi
                      </button>
                    )}
                    
                    {video.hindiDubbed && (
                      <button className="btn btn-success">
                        <FiPlay /> Play Hindi Version
                      </button>
                    )}
                    
                    <button 
                      className="btn btn-danger"
                      onClick={() => deleteVideo(video.id)}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2>✨ Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🎥 Large Video Support</h3>
              <p>Upload videos up to 2GB in multiple formats</p>
            </div>
            <div className="feature-card">
              <h3>🇮🇳 Hindi Dubbing</h3>
              <p>Automatic translation and voice dubbing</p>
            </div>
            <div className="feature-card">
              <h3>⚡ Fast Processing</h3>
              <p>Quick video processing pipeline</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Secure Storage</h3>
              <p>Your videos are stored securely</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>© 2024 Video Dub Hub | Made with ❤️ for Hindi dubbing</p>
          <p className="note">
            Note: This is a demo application. For production use, integrate with actual 
            translation and TTS (Text-to-Speech) services like Google Cloud Translation API 
            and Amazon Polly.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;