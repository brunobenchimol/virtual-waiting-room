# Virtual Waiting Room

## Overview
The **Virtual Waiting Room** project provides a scalable, efficient solution to handle high-traffic events on web applications. It manages user access to resources by queuing requests and ensuring an orderly experience.

**Note:** This implementation is a sample, simple base project and not a fully featured solution.

## Features
- Redis-based session management for efficient queue handling.
- NGINX integration for reverse proxying and load balancing.
- Static frontend interface to display waiting room status.
- Token-based user identification and session tracking.

## Project Structure
```
virtual-waiting-room/
├── LICENSE                  # Project licensing information
├── package.json             # Node.js project configuration
├── README.md                # Documentation file (this one)
├── nginx/
│   └── appsite              # NGINX configuration for the app
├── redis/
│   └── redis.conf           # Redis configuration file
├── server/
│   ├── app.js               # Main server application entry
│   ├── waitingRoom.js       # Core waiting room logic
│   └── static/              # Static frontend files
│       ├── index.html       # Frontend entry point
│       ├── script.js        # Client-side logic
│       └── styles.css       # Styling for the waiting room page
```

## Getting Started

### Prerequisites
- Node.js (v14.x or higher)
- Redis Server
- NGINX  

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd virtual-waiting-room
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Redis:
   Ensure Redis is running and properly configured using the provided `redis/redis.conf` file.

4. Ensure NGINX is running and properly configured using the provided configuration file `nginx/appsite`:
   ```bash
   sudo systemctl start nginx
   ```
   Check the status to confirm it's running:
   ```bash
   sudo systemctl status nginx
   ```

5. Copy static files to the location `/static` of the NGINX (root path) configured in `nginx/appsite`:
   ```bash
   sudo cp -r server/static/* /var/www/html/waiting_room
   ```
   Ensure the static files (`index.html`, `script.js`, `styles.css`) are accessible through NGINX.

6. Start the application:
   ```bash
   node server/app.js & node server/waitingRoom.js
   ```
   Ensure both `app.js` and `waitingRoom.js` are running for proper functionality.

### Configuration
- **NGINX**: The configuration file `nginx/appsite` provides a reverse proxy setup.
- **Redis**: Edit `redis/redis.conf` as needed for your environment.
- **Queue Settings:** Configure the maximum number of concurrent users by setting the `MAX_USERS` constant in `server/waitingRoom.js`. Adjust this number based on your server's capacity and expected traffic.

## Usage
Access the application via `http://localhost`. The waiting room interface will guide users during high-traffic events.

## Key Files
- `server/app.js`: Starts the main application server.
- `server/waitingRoom.js`: Contains the logic to queue users and manage their sessions.
- `server/static/index.html`: Frontend interface.
- `server/static/script.js`: Handles dynamic client-side interactions.
- `server/static/styles.css`: Provides styling for the waiting room page.

## Development
To run the server in development mode with automatic restarts:
```bash
npm install -g nodemon
nodemon server/app.js
```

## Deployment
1. Set up NGINX as a reverse proxy using the provided configuration.
2. Secure the application using SSL certificates.
3. Optimize Redis configuration for high-performance session management.

## TODO
- **Implement SSL:** Secure the application by configuring SSL certificates.
- **Enhanced Server Features:** Introduce dashboards for monitoring user sessions and queue status.
- **Monitoring and Logging:** Add advanced logging and monitoring tools.
- **Performance Improvements:** Optimize Redis and NGINX configurations for high-concurrency environments.
- **User Notifications:** Implement features to notify users about their queue status.

## License
This project is licensed under the terms specified in the `LICENSE` file.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## Troubleshooting
- Ensure Redis is running and accessible.
- Verify NGINX configuration if using it as a reverse proxy.
- Check the logs for errors:
  ```bash
  tail -f logs/server.log
  ```

## Contact
For any inquiries, please contact the project maintainers or create an issue in the repository.

