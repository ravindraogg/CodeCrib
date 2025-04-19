require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Adjust to your React app's port (e.g., 3000 if using create-react-app)
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
console.log('Attempting to connect to MongoDB with URI:', MONGO_URI);
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: '' },
  rememberMe: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpiry: Date,
});

const roomSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true, unique: true },
  mostUsedLanguage: { type: String },
  dateTime: { type: String, required: true },
  files: [{ type: String }],
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/profile_pics';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png)!'), false);
    }
  },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// API Endpoints

// Register
app.post('/api/register', upload.single('profilePic'), async (req, res) => {
  try {
    const { name, email, password, rememberMe } = req.body;
    const profilePic = req.file ? `/uploads/profile_pics/${req.file.filename}` : '';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      profilePic,
      rememberMe: rememberMe === 'true',
    });

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: rememberMe === 'true' ? '7d' : '1h',
    });

    res.status(201).json({ token, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    user.rememberMe = rememberMe;
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: rememberMe ? '7d' : '1h',
    });

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Request Reset
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    console.log(`Reset token for ${email}: ${resetToken}`);
    res.json({ message: 'Password reset link sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
app.post('/api/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Rooms
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const rooms = await Room.find({ userId: req.user.id })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Room.countDocuments({ userId: req.user.id });

    res.json({
      rooms,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Rooms fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { mostUsedLanguage = 'JavaScript' } = req.body;
    
    const roomId = crypto.randomBytes(3).toString('hex');
    
    const newRoom = new Room({
      userId: req.user.id,
      id: roomId,
      mostUsedLanguage,
      dateTime: new Date().toISOString(),
      files: [],
    });
    
    await newRoom.save();
    res.status(201).json({ room: newRoom });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room details
app.get('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId }).lean();
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join room
app.post('/api/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const user = await User.findById(req.user.id).select('name profilePic');
    
    res.json({
      room,
      participant: {
        id: user._id,
        name: user.name,
        profilePic: user.profilePic,
        online: true
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload file to room
app.post('/api/rooms/:roomId/files', authenticateToken, multer().single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileName, fileExt, lines } = req.body;
    
    if (!req.file && !fileName) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const room = await Room.findOne({ id: roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const fileId = crypto.randomBytes(8).toString('hex');
    const uploadedFileName = fileName || req.file.originalname;
    const finalFileName = `${fileId}-${uploadedFileName}`;
    
    if (req.file) {
      const uploadPath = './uploads/room_files';
      fs.mkdirSync(uploadPath, { recursive: true });
      fs.writeFileSync(`${uploadPath}/${finalFileName}`, req.file.buffer);
    }
    
    room.files.push(finalFileName);
    await room.save();
    
    const fileData = {
      id: fileId,
      name: uploadedFileName,
      ext: fileExt || uploadedFileName.split('.').pop() || '',
      lines: lines || (req.file ? Math.ceil(req.file.buffer.toString().split('\n').length) : 0),
      read: false
    };
    
    io.to(roomId).emit('newFile', fileData);
    
    res.status(201).json({ file: fileData });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetToken -resetTokenExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket.IO Implementation
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', async ({ roomId, userId, userName }) => {
    try {
      socket.join(roomId);
      console.log(`User ${userName} (${userId}) joined room ${roomId}`);

      socket.to(roomId).emit('userJoined', {
        id: userId,
        name: userName,
        online: true
      });

      const socketsInRoom = await io.in(roomId).fetchSockets();
      const participants = socketsInRoom.map(s => ({
        id: s.data.userId,
        name: s.data.userName,
        online: true
      }));

      socket.emit('roomParticipants', participants);

      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.userName = userName;
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('message', (msg) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.to(roomId).emit('message', {
        ...msg,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('newFile', (file) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.to(roomId).emit('newFile', file);
    }
  });

  socket.on('fileRead', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.to(roomId).emit('fileRead', {
        ...data,
        userId: socket.data.userId
      });
    }
  });

  socket.on('fileDelete', (data) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      io.to(roomId).emit('fileDelete', {
        ...data,
        userId: socket.data.userId
      });
    }
  });

  socket.on('statusChange', ({ online }) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('userStatus', {
        userId: socket.data.userId,
        online
      });
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    console.log(`User disconnected: ${socket.id} from room: ${roomId}`);

    if (roomId) {
      socket.to(roomId).emit('userLeft', {
        userId: socket.data.userId,
        name: socket.data.userName
      });
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO`);
});