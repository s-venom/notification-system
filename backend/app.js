const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const async = require('async');
const winston = require('winston');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Logger setup
const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  )
});

app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/insyd', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  preferences: { type: Object, default: { notifyFollows: true, notifyPosts: true } }
});
const followSchema = new mongoose.Schema({
  followerId: mongoose.Types.ObjectId,
  followeeId: mongoose.Types.ObjectId
});
const activitySchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  type: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const notificationSchema = new mongoose.Schema({
  receiverId: mongoose.Types.ObjectId,
  actorId: mongoose.Types.ObjectId,
  type: String,
  content: String,
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Follow = mongoose.model('Follow', followSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Indexes for performance
User.collection.createIndex({ username: 1 });
Follow.collection.createIndex({ followeeId: 1 });
Notification.collection.createIndex({ receiverId: 1, timestamp: -1 });

// In-memory queue for event processing
const eventQueue = async.queue(async (eventData, callback) => {
  try {
    const event = new Activity(eventData);
    await event.save();
    logger.info(`Event saved: ${JSON.stringify(event, null, 2)}`);

    // Find receivers based on event type
    let receivers = [];
    if (event.type === 'follow') {
      receivers = [event.targetId]; // Notify followee
    } else if (event.type === 'post') {
      const follows = await Follow.find({ followeeId: event.actorId });
      receivers = follows.map(f => f.followerId);
      logger.info(`Found ${receivers.length} followers for user ${event.actorId}`);
    }

    // Generate notifications
    for (const receiverId of receivers) {
      const user = await User.findById(receiverId);
      if (user && user.preferences[`notify${event.type.charAt(0).toUpperCase() + event.type.slice(1)}s`]) {
        const notif = new Notification({
          receiverId,
          actorId: event.actorId,
          type: event.type,
          content: `User ${event.actorId} ${event.type === 'follow' ? 'followed you' : `created a ${event.type}: ${event.content}`}`
        });
        await notif.save();
        logger.info(`Notification created: ${JSON.stringify(notif, null, 2)}`);
        io.to(receiverId.toString()).emit('newNotification', notif);
      }
    }
  } catch (err) {
    logger.error(`Queue error: ${err.message}`);
  }
  callback();
}, 1);

// Socket.io connection
io.on('connection', (socket) => {
  logger.info('User connected');
  socket.on('join', (userId) => {
    socket.join(userId);
    logger.info(`User ${userId} joined room`);
  });
});

// Routes
// Get all users (for frontend dropdown)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    logger.info(`Fetched ${users.length} users`);
    res.send(users);
  } catch (err) {
    logger.error(`Error fetching users: ${err.message}`);
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});

// Create follow relationship
app.post('/follow', async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(followerId) || !mongoose.Types.ObjectId.isValid(followeeId)) {
      return res.status(400).send({ error: 'Invalid followerId or followeeId' });
    }
    if (followerId === followeeId) {
      return res.status(400).send({ error: 'Cannot follow self' });
    }
    const existingFollow = await Follow.findOne({ followerId, followeeId });
    if (existingFollow) {
      return res.status(400).send({ error: 'Already following' });
    }
    const follow = new Follow({ followerId, followeeId });
    await follow.save();
    logger.info(`Follow created: ${JSON.stringify(follow, null, 2)}`);
    eventQueue.push({ type: 'follow', actorId: followerId, targetId: followeeId });
    res.send(follow);
  } catch (err) {
    logger.error(`Error creating follow: ${err.message}`);
    res.status(500).send({ error: 'Failed to create follow' });
  }
});

// Create activity
app.post('/activity', async (req, res) => {
  try {
    const { userId, type, content } = req.body;
    if (!userId || !type || !content || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid input: userId, type, and content required' });
    }
    const activity = new Activity({ userId, type, content });
    await activity.save();
    logger.info(`Activity created: ${JSON.stringify(activity, null, 2)}`);
    eventQueue.push({ type, actorId: userId, content });
    res.send(activity);
  } catch (err) {
    logger.error(`Error creating activity: ${err.message}`);
    res.status(500).send({ error: 'Failed to create activity' });
  }
});

// Fetch notifications
app.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid userId' });
    }
    const query = { receiverId: userId };
    if (type && type !== 'all') {
      query.type = type;
    }
    const notifications = await Notification.find(query).sort({ timestamp: -1 });
    await Notification.updateMany({ receiverId: userId, isRead: false }, { isRead: true });
    logger.info(`Fetched ${notifications.length} notifications for user ${userId}`);
    res.send(notifications);
  } catch (err) {
    logger.error(`Error fetching notifications: ${err.message}`);
    res.status(500).send({ error: 'Failed to fetch notifications' });
  }
});

// Update notification read status
app.patch('/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { isRead } = req.body;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).send({ error: 'Invalid notificationId' });
    }
    if (typeof isRead !== 'boolean') {
      return res.status(400).send({ error: 'isRead must be a boolean' });
    }
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead },
      { new: true }
    );
    if (!notification) {
      return res.status(404).send({ error: 'Notification not found' });
    }
    logger.info(`Updated notification ${notificationId} to isRead: ${isRead}`);
    res.send(notification);
  } catch (err) {
    logger.error(`Error updating notification: ${err.message}`);
    res.status(500).send({ error: 'Failed to update notification' });
  }
});

server.listen(5000, () => logger.info('Server running on port 5000'));