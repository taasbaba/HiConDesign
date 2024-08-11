# Multiplayer Game Architecture

## Overview

This project is a scalable architecture designed to support a multiplayer game where players engage in various activities, including attacking monsters. The architecture leverages multiple servers to handle different aspects of the game, ensuring efficient processing and load balancing. The system is built using modern web technologies such as Express.js, Socket.IO, JWT, and Redis.

## Current Components

### 1. Gate Server
- **Purpose**: Handles player login, authentication, and load balancing between Game Servers.
- **Technology Stack**: Express.js, Socket.IO, JWT, Crypto
- **Details**: 
  - Validates user credentials and generates a JWT token upon successful login.
  - Provides the player with a Game Server URL to connect to after authentication.

### 2. Game Server
- **Purpose**: Manages general game logic, processes player actions, and coordinates with the Instance Server for specific tasks like monster attacks.
- **Technology Stack**: Socket.IO, JWT, Axios (for HTTP requests to other services)
- **Details**: 
  - Handles authenticated player connections and manages game state.
  - Pings the client every 5 seconds to maintain connection and trigger in-game events.
  - Sends attack requests to the Instance Server when a player initiates an attack.

### 3. Instance Server
- **Purpose**: Processes specific in-game events like monster attacks, calculates outcomes, and updates game states.
- **Technology Stack**: Socket.IO, Express.js (for future extensions)
- **Details**: 
  - Receives attack requests from the Game Server.
  - Processes the logic for each attack and updates the monster's health status.
  - Sends the results back to the Game Server to broadcast to players.

## Future Architecture

The future architecture aims to include additional components to enhance scalability and maintainability:

### 1. Data Server
- **Purpose**: Centralized data management for game states, including monster health and player actions.
- **Technology Stack**: Redis, Database (specific DB technology to be determined)
- **Responsibilities**:
  - Store temporary game state information in Redis for quick access.
  - Persist important game data to a database for long-term storage and analysis.

### 2. Additional Game Servers
- **Purpose**: Scale the game horizontally by adding more Game Servers as needed.
- **Load Balancing**: Managed by the Gate Server to distribute players evenly across available Game Servers.

## Monster Attack Mechanism

The Game Server only handles the request and reward processing for monster attacks. The Instance Server controls the monster’s health, attack timing, and kill determination. Each attack request is processed in sequence to ensure accuracy, and the final killer is recorded based on the last successful attack.

## Installation and Setup

### Prerequisites
- Node.js (v14 or later)
- npm (Node Package Manager)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/taasbaba/HiConDesign.git
   cd HiConDesign
   ```
   
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run all servers using `app.js`:
- This script will automatically start the Gate Server, Game Server, and Instance Server. It also ensures that all servers are properly terminated when you stop `app.js`.
  ```
  node app.js
  ```

4. Alternatively, run each server separately:
- **Gate Server**:
  ```
  node gate-server.js
  ```
- **Game Server**:
  ```
  node game-server.js game-1 (for `game-1`)
  ```
- **Instance Server**:
  ```
  node instance-server.js
  ```

## Future Work

- Implement the Data Server to handle Redis and database interactions.
- Expand the number of Game Servers to support more players.
- Optimize the monster attack logic for performance under high concurrency.
- Add more game features and activities that can interact with the current server setup.

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request for review.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
