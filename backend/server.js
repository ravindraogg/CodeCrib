require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const { GridFSBucket } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://code-crib.netlify.app",
    methods: ["GET", "POST", "DELETE"]
  }
});

app.use(cors({
  origin: "https://code-crib.netlify.app",
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));
app.use(express.json());

let gridfsBucket;
let dbConnectionPromise = mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    gridfsBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
    console.log('GridFS initialized');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const upload = multer(); 

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  profilePicId: { type: mongoose.Types.ObjectId },
  rememberMe: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpiry: Date,
});

const roomSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true, unique: true },
  mostUsedLanguage: { type: String },
  dateTime: { type: String, required: true },
  files: [{
    fileId: { type: mongoose.Types.ObjectId },
    name: String,
    ext: String,
    lines: Number,
    read: { type: Boolean, default: false }
  }],
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    profilePicId: { type: mongoose.Types.ObjectId }
  }]
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token is required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

app.post('/api/register', upload.single('profilePic'), async (req, res) => {
  try {
    await dbConnectionPromise;
    const { name, email, password, rememberMe } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profilePicId;

    if (req.file) {
      const filename = `${Date.now()}-${req.file.originalname}`;
      const uploadStream = gridfsBucket.openUploadStream(filename, {
        contentType: req.file.mimetype
      });
      uploadStream.end(req.file.buffer);
      profilePicId = uploadStream.id;
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      profilePicId,
      rememberMe: rememberMe === 'true',
    });

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: rememberMe === 'true' ? '7d' : '1h',
    });

    res.status(201).json({ token, message: 'Registration completed successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register user. Please try again later.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    await dbConnectionPromise;
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }

    user.rememberMe = rememberMe;
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: rememberMe ? '7d' : '1h',
    });

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to log in. Please try again later.' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    await dbConnectionPromise;
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    console.log(`Reset token for ${email}: ${resetToken}`);
    res.json({ message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset request. Please try again later.' });
  }
});

app.post('/api/reset-password/:token', async (req, res) => {
  try {
    await dbConnectionPromise;
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'The reset token is invalid or has expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password. Please try again later.' });
  }
});

app.get('/api/rooms/:roomId/files/:fileName', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
    const { roomId, fileName } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const file = room.files.find(f => f.name === fileName);
    if (!file || !file.fileId) {
      return res.status(404).json({ message: 'File not found in the room' });
    }

    const downloadStream = gridfsBucket.openDownloadStream(file.fileId);
    let content = '';
    
    downloadStream.on('data', (chunk) => {
      content += chunk.toString('utf8');
    });

    downloadStream.on('error', () => {
      res.status(404).json({ message: 'Error retrieving file from storage' });
    });

    downloadStream.on('end', () => {
      res.json({ content });
    });
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).json({ message: 'Failed to retrieve file. Please try again later.' });
  }
});

app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
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
    res.status(500).json({ message: 'Failed to fetch rooms. Please try again later.' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
    const { mostUsedLanguage = 'JavaScript' } = req.body;
    
    const roomId = crypto.randomBytes(3).toString('hex');
    
    const newRoom = new Room({
      userId: req.user.id,
      id: roomId,
      mostUsedLanguage,
      dateTime: new Date().toISOString(),
      files: [],
      participants: []
    });
    
    await newRoom.save();
    res.status(201).json({ room: newRoom });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Failed to create room. Please try again later.' });
  }
});

app.get('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId }).lean();
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Failed to retrieve room details. Please try again later.' });
  }
});

app.post('/api/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const user = await User.findById(req.user.id).select('name profilePicId');
    
    if (!room.participants.some(p => p.userId.toString() === user._id.toString())) {
      room.participants.push({
        userId: user._id,
        name: user.name,
        profilePicId: user.profilePicId
      });
      await room.save();
    } else {
      room.participants = room.participants.map(p =>
        p.userId.toString() === user._id.toString()
          ? { ...p, profilePicId: user.profilePicId }
          : p
      );
      await room.save();
    }
    
    res.json({
      room,
      participant: {
        id: user._id,
        name: user.name,
        profilePicId: user.profilePicId,
        online: true
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Failed to join room. Please try again later.' });
  }
});

app.post('/api/rooms/:roomId/files', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    await dbConnectionPromise;
    if (!gridfsBucket) {
      throw new Error('GridFS is not initialized');
    }

    const { roomId } = req.params;
    const { fileName, fileExt } = req.body;
    
    if (!req.file && !fileName) {
      return res.status(400).json({ message: 'No file provided for upload' });
    }
    
    const room = await Room.findOne({ id: roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    const fileId = crypto.randomBytes(8).toString('hex');
    const uploadedFileName = fileName || req.file.originalname;
    let gridfsFileId;

    if (req.file) {
      const finalFileName = `${fileId}-${uploadedFileName}`;
      const uploadStream = gridfsBucket.openUploadStream(finalFileName, {
        contentType: req.file.mimetype
      });
      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        throw error;
      });
      uploadStream.end(req.file.buffer);
      gridfsFileId = uploadStream.id;
    }

    const fileData = {
      fileId: gridfsFileId,
      name: uploadedFileName,
      ext: fileExt || uploadedFileName.split('.').pop() || '',
      lines: req.file ? Math.ceil(req.file.buffer.toString().split('\n').length) : 0,
      read: false
    };

    room.files.push(fileData);
    await room.save();
    
    io.to(roomId).emit('newFile', fileData);
    
    res.status(201).json({ file: fileData });
  } catch (error) {
    console.error('File upload error:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to upload file. Please try again later.' });
  }
});

app.post('/api/profile/update', authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    await dbConnectionPromise;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.file) {
      const filename = `${Date.now()}-${req.file.originalname}`;
      const uploadStream = gridfsBucket.openUploadStream(filename, {
        contentType: req.file.mimetype
      });
      uploadStream.end(req.file.buffer);
      user.profilePicId = uploadStream.id;
    }

    await user.save();
    await Room.updateMany(
      { 'participants.userId': user._id },
      { $set: { 'participants.$.profilePicId': user.profilePicId } }
    );

    res.json({ message: 'Profile updated successfully', profilePicId: user.profilePicId });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile. Please try again later.' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    await dbConnectionPromise;
    const user = await User.findById(req.user.id).select('-password -resetToken -resetTokenExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile. Please try again later.' });
  }
});

app.get('/api/files/:fileId', async (req, res) => {
  try {
    await dbConnectionPromise;
    const { fileId } = req.params;
    const downloadStream = gridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    downloadStream.on('error', () => {
      res.status(404).json({ message: 'File not found in storage' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ message: 'Failed to retrieve file. Please try again later.' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'with userId: (not yet set)');

  socket.on('joinRoom', async ({ roomId, userId, userName }) => {
    try {
      if (!userId || !userName) {
        console.error(`Invalid joinRoom data: userId=${userId}, userName=${userName}`);
        return;
      }

      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.userName = userName;

      socket.join(roomId);
      console.log(`User ${userName} (${userId}) joined room ${roomId} with socket ${socket.id}`);

      socket.to(roomId).emit('userJoined', {
        id: userId,
        name: userName,
        online: true
      });

      const room = await Room.findOne({ id: roomId });
      if (!room) {
        console.error(`Room ${roomId} not found`);
        return;
      }

      const socketsInRoom = await io.in(roomId).fetchSockets();
      const onlineUserIds = new Set(socketsInRoom
        .filter(s => s.data.userId && s.data.userName)
        .map(s => s.data.userId));
      const userIds = room.participants.map(p => p.userId);
      const users = await User.find({ _id: { $in: userIds } }).select('name profilePicId');

      const uniqueParticipants = Array.from(
        new Map(
          room.participants.map(p => {
            const user = users.find(u => u._id.toString() === p.userId.toString());
            return [
              p.userId.toString(),
              {
                id: p.userId.toString(),
                name: p.name,
                profilePicId: user?.profilePicId || p.profilePicId,
                online: onlineUserIds.has(p.userId.toString())
              }
            ];
          })
        ).values()
      );

      console.log(`Participants in room ${roomId}:`, uniqueParticipants);
      io.to(roomId).emit('roomParticipants', uniqueParticipants);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('message', (msg) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      socket.to(roomId).emit('message', {
        ...msg,
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn(`Message ignored: missing roomId=${roomId} or userId=${userId}`);
    }
  });

  socket.on('newFile', (file) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      io.to(roomId).emit('newFile', file);
    } else {
      console.warn(`New file ignored: missing roomId=${roomId} or userId=${userId}`);
    }
  });

  socket.on('fileRead', (data) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      io.to(roomId).emit('fileRead', {
        ...data,
        userId
      });
    } else {
      console.warn(`File read ignored: missing roomId=${roomId} or userId=${userId}`);
    }
  });

  socket.on('fileDelete', (data) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      io.to(roomId).emit('fileDelete', {
        ...data,
        userId
      });
    } else {
      console.warn(`File delete ignored: missing roomId=${roomId} or userId=${userId}`);
    }
  });

  socket.on('statusChange', ({ online }) => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      socket.to(roomId).emit('userStatus', {
        userId,
        online
      });
    } else {
      console.warn(`Status change ignored: missing roomId=${roomId} or userId=${userId}`);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    console.log(`User disconnected: ${socket.id} from room: ${roomId}, userId: ${userId || '(not set)'}`);

    if (roomId && userId) {
      socket.to(roomId).emit('userLeft', {
        userId,
        name: socket.data.userName
      });
    }
  });
});

dbConnectionPromise.then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.IO`);
  });
});