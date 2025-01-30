// Cookie timeout
const tokenExpirationTime = 60 * 3; // 3 minutes (in seconds)

// Connect to the server via WebSocket
const socket = io();

// Generate or fetch a unique userId
let userId = localStorage.getItem("userId");
if (!userId) {
  userId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userId", userId);
}

// Set the userId in a cookie
document.cookie = `userId=${userId}; path=/; max-age=${tokenExpirationTime * 1000};`; 

console.log("Joining queue with userId:", userId);

// Emit the joinQueue event with the userId
socket.emit("joinQueue", { userId });

// Handle queue position updates
socket.on("queuePosition", (data) => {
  console.log("Received queuePosition event:", data);
  const queuePosition = data.position;
  const allowed = data.allowed;

  if (allowed) {
    alert(`You are allowed into the application. Redirecting...`); // not needed but nice to alert the user need to click.
    // console.log("Token = ", userId);
    // Redirect to the main application
    window.location.href = `/app`; 
  } else {
    document.getElementById("queuePosition").innerText = 
      `Your queue position is: ${queuePosition}`;   
  }
});

// Handle errors from the server
socket.on("error", (data) => {
  alert(`Error: ${data.message}`);
});

// Display userId
if (userId) {
  document.getElementById("userId").innerText = `User ID: ${userId}`; 
}
