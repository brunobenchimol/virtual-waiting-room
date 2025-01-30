const express = require("express");
const redis = require("redis");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Redis client setup
const redisClient = redis.createClient();
redisClient.connect();

// Queue settings
const MAX_USERS = 1; // Max concurrent users allowed

const queueKey = "queue"; // Redis list for the queue
const activeUsersKey = "activeUsers"; // Redis set for active users
//const tokenKeyPrefix = "userToken:"; // Redis key prefix for tokens
const tokenExpirationTime = 60 * 3; // 3 minutes (in seconds)

// Middleware
app.use(express.static("static"));
app.use(bodyParser.json());
app.use(cookieParser());

// Store mapping between userId and socketId
const userSocketMap = new Map();

// WebSocket for real-time updates
io.on("connection", (socket) => {
  console.log("New connection received Socket ID:", socket.id);

  socket.on("joinQueue", async ({ userId }) => {
    if (!userId) {
      console.error("Invalid userId received");
      socket.emit("error", { message: "Invalid userId" });
      return;
    }
  
    // Store the mapping between userId and socketId
    userSocketMap.set(userId, socket.id);
    console.log(`Mapping stored: userId = ${userId}, socketId = ${socket.id}`);

    console.log(`User ${userId} is trying to join.`);
    
    const activeUsersCount = await redisClient.sCard(activeUsersKey);
  
    if (activeUsersCount < MAX_USERS) {
      await redisClient.sAdd(activeUsersKey, userId);

      // Ensure the key exists by setting it if it doesn't
      const keyExists = await redisClient.exists(userId);
      if (!keyExists) {
        await redisClient.set(userId, '', 'EX', tokenExpirationTime);
      } else {
        await redisClient.expire(userId, tokenExpirationTime);
      }

      const allowedTime = new Date().toISOString();
      console.log(`User ${userId} allowed at ${allowedTime}`);
      socket.emit("queuePosition", { position: 0, allowed: true });      
    } else {
      await redisClient.rPush(queueKey, userId);
      const position = await getQueuePosition(userId);
      socket.emit("queuePosition", { position, allowed: false });
      console.log(`User ${userId} added to the queue at position: ${position}`);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    // Remove the mapping between userId and socketId
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }

  });
});

// API to refresh userId expiration time
app.post("/refresh-userid-expiration", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Invalid userId", userId });
  }

  const isActive = await redisClient.sIsMember(activeUsersKey, userId);

  if (isActive) {
    // Ensure the key exists by setting it if it doesn't
    const keyExists = await redisClient.exists(userId);
    if (!keyExists) {
      await redisClient.set(userId, '', 'EX', tokenExpirationTime);
    } else {
      await redisClient.expire(userId, tokenExpirationTime);
    }

    const newTTL = await redisClient.ttl(userId);
    console.log(`New TTL for user ${userId}: ${newTTL} seconds`);

    return res.status(200).json({ message: "Expiration time refreshed", userId });
  } else {
    console.log(`User ${userId} is not active and cannot refresh token expiration time.`);
    return res.status(403).json({ message: "User is not active", userId });
  }
});

// API to validate userId
app.get("/validate-userid", async (req, res) => {
  const userId = req.cookies.userId;

  if (!userId) {
    return res.status(400).json({ message: "Invalid userId", userId });
  }

  const isActive = await redisClient.sIsMember(activeUsersKey, userId);

  if (isActive) {
    return res.status(200).json({ message: "userId is valid and active", userId });
  } else {
    return res.status(403).json({ message: "userId is not active", userId });
  }
});

// Utility function to get queue position
async function getQueuePosition(userId) {
  const queue = await redisClient.lRange(queueKey, 0, -1);
  return queue.indexOf(userId) + 1;
}

// Allow the next user in the queue
async function allowNextUser() {
  const nextUser = await redisClient.lPop(queueKey);
  if (nextUser) {
    await redisClient.sAdd(activeUsersKey, nextUser);

    // Ensure the key exists by setting it if it doesn't
    const keyExists = await redisClient.exists(nextUser);
    if (!keyExists) {
      await redisClient.set(nextUser, '', 'EX', tokenExpirationTime);
    } else {
      await redisClient.expire(nextUser, tokenExpirationTime);
    }

    // Remove the user from the wait queue 
    await redisClient.lRem(queueKey, 0, nextUser);

    const allowedTime = new Date().toISOString();
    console.log(`User ${nextUser} allowed from the queue at ${allowedTime}.`);
    // io.emit("queueUpdate", { allowedUser: nextUser }); 

    // Emit queuePosition event for the allowed user
    const socketId = userSocketMap.get(nextUser);
    if (socketId) {
      console.log(`Emitting queuePosition to socketId: ${socketId} for user: ${nextUser}`);
      io.to(socketId).emit("queuePosition", { position: 0, allowed: true });
    } else {
      console.error(`No socketId found for user: ${nextUser}`);
    }

    // Update queue positions for all users in the queue
    const queue = await redisClient.lRange(queueKey, 0, -1);
    queue.forEach(async (userId, index) => {
      const position = index + 1;
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        console.log(`Emitting queuePosition to socketId: ${socketId} for user: ${userId} with position: ${position}`);
        io.to(socketId).emit("queuePosition", { position, allowed: false });
      } else {
        console.error(`No socketId found for user: ${userId}`);
      }
    });
  }
}

// API to check queue status
app.get("/queue-status", async (req, res) => {
  const queueLength = await redisClient.lLen(queueKey);
  const activeUsers = await redisClient.sCard(activeUsersKey);
  const activeUsersMembers = await redisClient.sMembers(activeUsersKey);
  res.json({ queueLength, activeUsers, activeUsersMembers });
});

// API to reset queue and active users
app.post("/reset-queue", async (req, res) => {
  await redisClient.del(queueKey);
  await redisClient.del(activeUsersKey);
  res.json({ message: "Queue and active users reset." });
});

// API endpoint to get all Redis data
app.get("/redis-data", async (req, res) => {
  try {
    const queue = await redisClient.lRange(queueKey, 0, -1);
    const activeUsers = await redisClient.sMembers(activeUsersKey);

    // Get all keys (you might want to filter if you have many keys)
    const allKeys = await redisClient.keys("*"); // "*" gets all keys

    const keyValues = {}; // Object to store key-value pairs

    // Efficiently get values for all keys using MGET
    if (allKeys.length > 0) {
        const values = await redisClient.mGet(allKeys);
        for (let i = 0; i < allKeys.length; i++) {
            keyValues[allKeys[i]] = values[i];
        }
    }

    res.json({
      queue: queue,
      activeUsers: activeUsers,
      allKeys: keyValues, // Include all key-value pairs
    });
  } catch (error) {
    console.error("Error getting Redis data:", error);
    res.status(500).json({ error: "Failed to retrieve Redis data" });
  }
});

// Function to clear expired keys from activeUsers set
const clearExpiredKeys = async () => {
  const activeUsers = await redisClient.sMembers(activeUsersKey);

  for (const userId of activeUsers) {
    const ttl = await redisClient.ttl(userId);
    if (ttl === -2) { // Key does not exist
      await redisClient.sRem(activeUsersKey, userId);
      const removedTime = new Date().toISOString();
      console.log(`Removed expired user ${userId} from activeUsers set at ${removedTime}.`);
      await allowNextUser(); // Allow the next user in the queue
    }
  }
};

// Schedule the clearExpiredKeys function to run every minute
setInterval(clearExpiredKeys, 60 * 1000);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Waiting room service running on port ${PORT}`);
});
