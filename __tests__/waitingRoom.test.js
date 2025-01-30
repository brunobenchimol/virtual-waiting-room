const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const redis = require('redis-mock');

const app = express();

// Lots of issue with redis-mock, so I will mock the redis client
// const redisClient = redis.createClient();

// Mock Redis client
const redisClient = {
  sadd: jest.fn(),
  sismember: jest.fn(),
  set: jest.fn(),
  flushall: jest.fn()
};

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Define the /validate-userid endpoint
app.get('/validate-userid', async (req, res) => {
  const userId = req.cookies.userId;

  if (!userId) {
    return res.status(400).json({ message: "Invalid userId" });
  }

  const isActive = await new Promise((resolve, reject) => {
    redisClient.sismember('activeUsers', userId, (err, reply) => {
      if (err) return reject(err);
      resolve(reply);
    });
  });

  if (isActive) {
    return res.status(200).json({ message: "userId is valid and active", userId });
  } else {
    return res.status(403).json({ message: "userId is not active", userId });
  }
});

// Example test for /validate-userid endpoint
describe('GET /validate-userid', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mock Redis database before each test
  });

  it('should return 400 if userId is not provided', async () => {
    const res = await request(app).get('/validate-userid');
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message', 'Invalid userId');
  });

  it('should return 200 if userId is valid and active', async () => {
    const userId = 'testUser';
    redisClient.sadd.mockImplementation((key, value, callback) => callback(null, 1));
    redisClient.sismember.mockImplementation((key, value, callback) => callback(null, 1));
    redisClient.set.mockImplementation((key, value, mode, duration, callback) => callback(null, 'OK'));

    await new Promise((resolve, reject) => {
      redisClient.sadd('activeUsers', userId, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
    await new Promise((resolve, reject) => {
      redisClient.set(userId, '', 'EX', 60 * 3, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });

    const res = await request(app)
      .get('/validate-userid')
      .set('Cookie', `userId=${userId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'userId is valid and active');
  });
});