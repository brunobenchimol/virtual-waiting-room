const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

// Middleware to parse cookies
app.use(cookieParser());

const tokenExpirationTime = 60 * 3; // 3 minutes (in seconds)

// Middleware to check if the user is validated
const validateUser = async (req, res, next) => {
  const userId = req.cookies.userId;

  if (!userId) {
    return res.redirect("/");
  }

  const baseURL = `${req.protocol}://${req.get('host')}`;

  try {
    // Validate userId by calling /validate-userid endpoint
    const validateResponse = await axios.get(`${baseURL}/validate-userid`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `userId=${userId}`
      }
    });

    if (validateResponse.status === 200) {
      // Refresh userId expiration time by calling /refresh-userid-expiration endpoint
      await axios.post(`${baseURL}/refresh-userid-expiration`, { userId });

      // Refresh cookie expiration time
      res.cookie("userId", userId, { maxAge: tokenExpirationTime * 1000, httpOnly: true });

      next();
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error validating user:", error.response ? error.response.data : error.message);
    res.redirect("/");
  }
};

// Route to the main application
app.get("/app", validateUser, (req, res) => {
  res.send("Welcome to the Main Application!");
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Main Application running on port ${PORT}`);
});