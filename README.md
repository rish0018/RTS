# AI RTS Tutor

A web-based real-time strategy (RTS) simulation platform that combines interactive gameplay with an intelligent AI tutor system. The AI tutor observes your gameplay in real-time and provides explainable, actionable guidance to help you learn and improve your strategic decision-making abilities. This project demonstrates how AI can be integrated into educational gaming experiences to provide personalized coaching and feedback.

## Project Overview

The AI RTS Tutor is a two-player asymmetric strategy game where you control defensive and offensive units to protect your base while attacking an opponent's base. Unlike traditional RTS games controlled by a single player, this system features an AI-controlled opponent that makes strategic decisions. The unique educational aspect is the integrated AI Tutor that analyzes the game state continuously and suggests optimal strategies with detailed explanations, helping you understand both immediate tactical decisions and longer-term strategic thinking.

The system uses real-time communication via WebSocket connections to maintain synchronized game state between the server and client, ensuring smooth, responsive gameplay with minimal latency.

---

## Quick Start Guide

This project requires two separate terminal sessions: one for running the Node.js backend server and one for running the React frontend application. These must be started independently and will communicate over WebSocket connections.

### Prerequisites

Before starting, ensure you have the following installed on your system:
- Node.js (version 14 or higher) and npm package manager
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Git (optional, for cloning the repository)

### Terminal 1: Start the Backend Server

The backend server is responsible for game logic, state management, AI decision-making, and serving the tutor suggestions. To start it:

```bash
cd server
npm install
npm start
```

After running these commands, the backend server will initialize and listen for connections on **http://localhost:3001**. You should see console output indicating the server is running and ready to accept client connections.

### Terminal 2: Start the Frontend Application

In a separate terminal window, navigate to the client directory and start the React development server:

```bash
cd client
npm install
npm start
```

The frontend application will spin up and typically open automatically in your default web browser at **http://localhost:3000**. If it doesn't open automatically, you can manually navigate to this address. The client will automatically attempt to connect to the backend server via WebSocket.

### Verification

You should see:
1. A game arena displaying a grid-based battlefield
2. Your player units at the bottom half of the screen
3. An enemy area at the top half where AI-controlled units spawn
4. A deployment panel on the right side for selecting and placing units
5. A statistics bar at the top showing current game information
6. An AI Tutor panel displaying strategic suggestions

---

## How to Play

The gameplay follows a turn-based real-time strategy format where both you and the AI opponent manage resources and deploy units to achieve victory.

### Game Mechanics

**Game Arena and Field**: The playing field is organized as a grid divided into two operational zones: your defensive zone (bottom half) and the opponent's zone (top half). This division creates strategic depth as you must manage both defense against incoming threats and offense to push toward victory.

**Unit Deployment**: 
1. Click on a specific cell or column in your bottom half to select a deployment zone where you want to place units
2. Open the Deploy Panel on the right sidebar to view available units, their stats (health, attack damage, cost), and deployment costs measured in Elixir
3. Select the unit type you want to deploy
4. Click the Deploy button to place the unit (this action consumes the required amount of Elixir)

**Resource Management**: Your primary resource is Elixir, which regenerates over time. You accumulate Elixir gradually as the game progresses, with a maximum cap to prevent excessive hoarding. Strategic decisions involve choosing when to spend resources (deploying units) versus when to bank resources for upcoming needs.

**Combat and Objectives**: 
- Your units will automatically move forward and engage enemy units and structures
- Enemy units will attempt to destroy your King Tower (the central objective structure in your zone)
- Your objective is to destroy the enemy's King Tower while defending your own
- When either player destroys the opponent's King Tower, the game ends in victory for the attacking player

**Winning and Losing**: Victory is achieved by reducing the enemy King Tower to zero health. Defeat occurs when your King Tower is destroyed by enemy units.

---

## Project Architecture

The system follows a client-server architecture with clear separation of concerns. The backend handles all game logic and AI decision-making, while the frontend provides the user interface and real-time visualization.

```
ai-rts-tutor/
├── server/                  # Node.js Backend (Port 3001)
│   ├── index.js             # Express HTTP server and Socket.IO manager
│   │                         # Handles client connections and WebSocket events
│   ├── game/
│   │   └── gameState.js     # Core game engine including:
│   │                         # - Game state management
│   │                         # - Tick-based simulation loop
│   │                         # - Unit spawning and movement
│   │                         # - Combat calculations
│   │                         # - Tower and resource management
│   └── tutor/
│       └── tutor.js         # AI Tutor system including:
│                             # - Rule-based decision engine
│                             # - Game state analysis
│                             # - Suggestion generation
│                             # - Confidence scoring
│
└── client/                  # React Frontend (Port 3000)
    └── src/
        ├── App.jsx           # Root application component
        │                     # Application layout and main structure
        ├── Arena.jsx         # Game board renderer
        │                     # Displays grid, units, towers, and entities
        ├── DeployPanel.jsx   # Unit deployment interface
        │                     # Shows available units and deployment options
        ├── TutorPanel.jsx    # AI suggestion display component
        │                     # Shows AI recommendations and explanations
        ├── StatsBar.jsx      # Head-up display (HUD)
        │                     # Shows game timer, health, elixir, and status
        ├── GameOver.jsx      # Game end screen overlay
        │                     # Displays win/loss state and restart option
        └── useSocket.js      # WebSocket connection hook
                              # Manages real-time communication with server
```

### Technology Stack

**Backend**:
- Node.js: JavaScript runtime for server-side execution
- Express: Web framework for HTTP routing and server setup
- Socket.IO: Real-time, bidirectional communication library for WebSocket management

**Frontend**:
- React: JavaScript library for building user interfaces
- Hooks (React custom hooks): For state management and lifecycle
- WebSocket API: For real-time communication with the backend

---

## AI Tutor System

The AI Tutor is a rule-based system that continuously monitors the game state and generates strategic suggestions to help players learn optimal gameplay strategies. Rather than playing the game itself, the tutor acts as a coach analyzing your current situation and recommending the best course of action.

### How the Tutor Works

The tutor system operates on a periodic evaluation cycle, typically analyzing the game state every 3 seconds. During each analysis cycle, the tutor:

1. **Examines the current game state**: Reviews unit positions, tower health, available resources, and resource regeneration rates
2. **Evaluates strategic conditions**: Checks multiple conditions against predefined rule sets to identify critical situations
3. **Generates suggestions**: Creates specific, actionable recommendations tailored to the current game situation
4. **Calculates confidence**: Assigns a confidence score indicating how certain the AI is about each suggestion
5. **Sends feedback**: Transmits suggestions to the client for display to the player

### Strategic Decision Rules

The tutor evaluates the following conditions and provides corresponding suggestions:

| Game Condition | AI Tutor Suggestion | Reasoning |
|---|---|---|
| Enemy units detected near your towers | Deploy defensive units to that location | Immediate threat to your primary objective; defend to prevent tower damage |
| Your lane is clear with no enemy units | Execute offensive push down that lane | Opportunity to advance without immediate resistance; capitalize on openings |
| Your tower has significant health advantage | Deploy a powerful unit like a Giant for offensive push | Favorable defensive position allows for aggressive tactics without risk |
| Your Elixir resource is at maximum capacity | Spend Elixir immediately on unit deployment | Resource is capped and will be wasted if not used; no benefit to holding full resources |
| Your tower health is lower than enemy tower health | Deploy units to balance offensive and defensive needs | Defensive disadvantage means you should focus on both protection and counter-offense |

### Suggestion Structure

Each AI suggestion includes three key components that help players understand the reasoning:

- **Title**: A concise action label (e.g., "Defend Left Lane") that immediately communicates the suggested action
- **Reason**: A detailed human-readable explanation describing why this action is recommended based on the current game state
- **Confidence Score**: A numerical confidence value (typically 0-100 or 0-1) indicating how certain the AI is about this recommendation, helping players distinguish between strongly recommended and weakly recommended actions

This three-part structure ensures players don't just receive orders, but understand the strategic thinking behind each recommendation, supporting the learning objective.

---

## Real-Time Communication Protocol

The system uses WebSocket connections to maintain real-time synchronized game state between client and server. All communication occurs asynchronously, allowing gameplay to remain responsive while the server processes game logic.

### Server-to-Client Events

These events are sent from the server to update the client about game state changes:

| Event Name | Purpose | Data Payload |
|---|---|---|
| `INIT_STATE` | Sent when a client first connects to initialize the game | Complete game state object including arena dimensions, initial unit positions, tower health, available unit types with their stats, and current resource amounts |
| `GAME_UPDATE` | Sent every game tick (~100-200ms) to update game state | Incremental updates including unit positions, health values, elixir amounts, any unit deaths or spawns, and other state changes |
| `TUTOR_SUGGESTION` | Sent when AI tutor generates a new suggestion (~3 seconds) | Suggestion object containing title, detailed reason, confidence score, and recommended unit/lane |
| `ACTION_RESULT` | Response to player deployment attempts | Success or failure status, error message if deployment failed, updated game state |
| `GAME_OVER` | Sent when either player achieves victory | Winner identification, final scores, and restart option |

### Client-to-Server Events

These events are sent from the client to communicate player actions to the server:

| Event Name | Purpose | Data Payload |
|---|---|---|
| `PLAYER_ACTION` | Player attempts to deploy a unit | Action type (deployment), target column/cell, unit type selected |
| `RESTART_GAME` | Player requests to start a new game | None (simple restart signal) |

### Communication Flow Example

A typical game session follows this communication pattern:

1. Client connects to server via WebSocket
2. Server sends `INIT_STATE` with full initial game configuration
3. Client renders the game board with initial state
4. Every tick (~100-200ms): Server sends `GAME_UPDATE` events, client updates display
5. Every 3 seconds: Server sends `TUTOR_SUGGESTION`, client displays recommendation
6. When player clicks Deploy: Client sends `PLAYER_ACTION` event
7. Server validates action and responds with `ACTION_RESULT`
8. Cycle continues until either player destroys opponent's tower
9. Server sends `GAME_OVER` when victory condition is met
10. Player sees game over screen and can click restart
11. When restart requested: Client sends `RESTART_GAME`, server resets state
12. Process begins again from step 2

---

## Development and Customization

The modular architecture makes it straightforward to extend and customize the system:

**Game Balance**: Modify unit stats, costs, and tower health values in gameState.js to adjust difficulty and dynamics

**AI Tutor Logic**: Update the decision rules in tutor.js to teach different strategies or focus on specific gameplay aspects

**Visual Customization**: Modify React components to change the UI appearance, layout, or color scheme

**Game Mechanics**: Extend gameState.js to add new unit types, special abilities, or additional game rules

---

## Troubleshooting

**Cannot connect to server**: Ensure the backend server is running on port 3001 and the frontend is trying to connect to http://localhost:3001

**Units not appearing**: Verify the Arena.jsx is receiving game state updates and check browser console for errors

**Tutor suggestions not showing**: Check that tutor.js is being invoked and suggestions are being transmitted over WebSocket

**Gameplay feels slow**: Check network latency and ensure both server and client are running on the same machine for optimal performance

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, Socket.IO Client
- **AI**: Rule-based heuristic engine (upgradeable to Q-learning RL)

---

## 🔮 Planned Extensions

- [ ] Q-learning RL to improve suggestions over time
- [ ] Multiple game sessions / rooms
- [ ] MongoDB logging for replay analysis
- [ ] Player performance dashboard
