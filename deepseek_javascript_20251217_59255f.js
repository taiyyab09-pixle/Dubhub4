const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/videos';
fs.ensureDirSync(uploadDir);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// In-memory storage for videos (replace with database in production)
let videos = [];

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Routes

// Home route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Video Dub Hub API',
    endpoints: {
      upload: 'POST /api/upload',
      videos: 'GET /api/videos',
      dubbing: 'POST /api/dub/:id'
    }
  });
});

// Upload video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const video = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      title: req.body.title || req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadDate: new Date().toISOString(),
      status: 'uploaded',
      hindiDubbed: false,
      hindiFilename: null,
      progress: 0
    };

    videos.push(video);
    
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      video: {
        id: video.id,
        title: video.title,
        status: video.status
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all videos
app.get('/api/videos', (req, res) => {
  res.json(videos);
});

// Get single video
app.get('/api/video/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json(video);
});

// Request Hindi dubbing
app.post('/api/dub/:id', async (req, res) => {
  try {
    const video = videos.find(v => v.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Update video status
    video.status = 'processing';
    video.progress = 0;
    
    // Simulate dubbing process (in real app, this would call an API)
    const simulateDubbing = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        video.progress = progress;
        
        if (progress >= 100) {
          clearInterval(interval);
          video.status = 'completed';
          video.hindiDubbed = true;
          video.hindiFilename = `hindi-dub-${video.filename}`;
          console.log(`Dubbing completed for video: ${video.title}`);
        }
      }, 1000);
    };

    // Start dubbing simulation
    simulateDubbing();
    
    res.json({
      success: true,
      message: 'Dubbing process started',
      videoId: video.id,
      estimatedTime: '30 seconds'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dubbing progress
app.get('/api/progress/:id', (req, res) => {
  const video = videos.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  res.json({
    status: video.status,
    progress: video.progress,
    hindiDubbed: video.hindiDubbed
  });
});

// Delete video
app.delete('/api/video/:id', async (req, res) => {
  try {
    const index = videos.findIndex(v => v.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const video = videos[index];
    
    // Delete file from disk
    const filePath = path.join(uploadDir, video.filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
    
    // Remove from array
    videos.splice(index, 1);
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.resolve(uploadDir)}`);
});