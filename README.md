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

In a separate terminal window, navigate to the client React application directory and start the development server:

```bash
cd client/RTS-GAME
npm install
npm run dev
```

The Vite development server will start and automatically open your default web browser at **http://localhost:5173** (Vite's default port). The client will automatically attempt to connect to the backend server via WebSocket at http://localhost:3001.

If the browser doesn't open automatically, manually navigate to http://localhost:5173.

### Verification

Once both servers are running, you should see:

1. **Backend console output**: Confirmation that Express server is listening on http://localhost:3001
2. **Frontend console output**: Vite dev server notification showing the app is running at http://localhost:5173
3. **Browser display** (at http://localhost:5173):
   - A game arena displaying a grid-based battlefield (18 columns × 10 rows)
   - Your player units at the bottom half of the screen
   - An enemy area at the top half where AI-controlled units spawn
   - A deployment panel on the right side for selecting and placing units
   - A statistics bar at the top showing current game information
   - An AI Tutor panel displaying strategic suggestions

---

## How to Play

The gameplay follows a turn-based real-time strategy format where both you and the AI opponent manage resources and deploy units to achieve victory.

### Game Mechanics

**Game Arena and Field**: The playing field is a grid of 18 columns by 10 rows, divided into two zones by a river at row 4. Your defensive zone occupies rows 5-9 (bottom), while the AI opponent's zone occupies rows 0-3 (top). This physical division creates natural strategic boundaries for managing offensive and defensive unit positioning.

**Unit Types and Deployment**: The game features six distinct unit types, each with unique strengths and roles:

| Unit | Health | Damage | Range | Speed | Cost | Special Ability | Use Case |
|---|---|---|---|---|---|---|---|
| Knight | 80 | 15 | 1 | 1.0 | 3 Elixir | Balanced | General-purpose melee fighter |
| Archer | 40 | 20 | 3 | 1.0 | 3 Elixir | Ranged attacks | Attacking from distance |
| Giant | 200 | 30 | 1 | 0.5 | 5 Elixir | Targets towers; tank | Breaking through defenses |
| Wizard | 60 | 50 | 4 | 0.8 | 5 Elixir | Long-range magic | High damage, risky placement |
| Minion | 25 | 10 | 1 | 1.5 | 2 Elixir | Fast swarm unit | Quick lane pressure |
| Bomber | 50 | 35 | 3 | 0.7 | 4 Elixir | Splash damage | Area damage against grouped units |

To deploy a unit:
1. Click on a specific column in your zone to select a deployment location
2. Select the desired unit type from the Deploy Panel
3. Click Deploy (costs Elixir based on unit type)
4. The unit spawns at the edge of your zone and advances toward the enemy

**Defensive and Offensive Structures**: Each player controls three towers:
- **Two Side Towers** (left and right): Primary defensive structures with 100 HP each
- **King Tower** (center): Primary objective with 200 HP; destroying this achieves victory

**Resource Management**: Elixir is the primary resource for deploying units:
- You start with 5 Elixir, with a maximum capacity of 10
- Elixir regenerates automatically: +1 Elixir every 28 game ticks (~2.8 seconds)
- Strategic depth comes from deciding when to spend resources immediately versus banking for future needs
- The system tracks total elixir spent as a game statistic

**Combat System**: 
- Units automatically move forward and engage targets (enemy units and towers)
- Units prefer designated targets: Giants prioritize towers; other units engage nearest threats
- Attack speed varies by unit type; some units have cooldown mechanics between attacks
- **Splash Damage**: Bombers deal area-of-effect damage, hitting all enemies within range instead of single targets
- Combat resolution is continuous—units resolve their engagements every game tick
- Kills and tower destructions are tracked in per-player statistics

**Winning and Losing**: Victory is achieved by reducing the enemy King Tower to zero health. The game immediately ends when either player's King Tower is destroyed, displaying the winner on the game-over screen.

---

## Project Architecture

The system follows a client-server architecture with clear separation of concerns. The backend handles all game logic, AI decision-making, and RL training, while the frontend provides the user interface and real-time visualization.

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
│   ├── tutor/
│   │   └── tutor.js         # AI Tutor system including:
│   │                         # - RL simulation-based strategy generation
│   │                         # - Game state analysis
│   │                         # - Suggestion generation
│   │                         # - Confidence scoring
│   └── rl/                  # Reinforcement Learning System including:
│       ├── offlineTrainer.js    # Offline RL training loop
│       │                         # - Runs N simulations across synthetic game states
│       │                         # - Stores state-action pairs and rewards
│       │                         # - Builds persistent Q-tables
│       └── rlDatabase.js        # Persistent Q-table storage
│                                # - Survives server restarts
│                                # - Tracks training sessions and metrics
│
└── client/                  # React Frontend Root
    └── RTS-GAME/            # React Vite Application (Port 5173)
        └── src/
            ├── main.jsx           # React entry point
            ├── App.jsx            # Root application component
            │                      # Application layout and main structure
            ├── Arena.jsx          # Game board renderer
            │                      # Displays grid, units, towers, and entities
            ├── DeployPanel.jsx    # Unit deployment interface
            │                      # Shows available units and deployment options
            ├── TutorPanel.jsx     # AI suggestion display component
            │                      # Shows AI recommendations and explanations
            ├── RLDashboard.jsx    # RL training metrics and control panel
            │                      # Shows Q-table growth, rewards, training logs
            ├── StatsBar.jsx       # Head-up display (HUD)
            │                      # Shows game timer, health, elixir, and status
            ├── GameOver.jsx       # Game end screen overlay
            │                      # Displays win/loss state and restart option
            └── useSocket.js       # WebSocket connection hook
                                  # Manages real-time communication with server
```

### Technology Stack

**Backend**:
- Node.js: JavaScript runtime for server-side execution
- Express: Web framework for HTTP routing and server setup
- Socket.IO: Real-time, bidirectional communication library for WebSocket management

**Frontend**:
- React: JavaScript library for building user interfaces
- Vite: Fast build tool and development server for modern web applications
- Hooks (React custom hooks): For state management and lifecycle
- WebSocket API: For real-time communication with the backend server

---

## AI Tutor System

The AI Tutor is an advanced rule-based system enhanced with Reinforcement Learning (RL) simulation that analyzes game state in real-time and generates strategic suggestions. Rather than playing the game itself, the tutor acts as an intelligent coach that evaluates situations and recommends optimal actions with detailed reasoning.

### How the Tutor Works

The tutor operates on multiple evaluation cycles at different frequencies to balance accuracy with computational efficiency:

1. **Per-Tick Analysis (Every 100ms)**: The tutor checks for critical immediate threats and opportunities
2. **Periodic RL Simulation (Every 6 seconds)**: Runs reinforcement learning simulations to evaluate potential unit deployment strategies
3. **Suggestion Throttling (Every 3 seconds)**: Generates user-facing suggestions at human-readable intervals to avoid overwhelming the player

During each analysis cycle, the tutor:

1. **Assesses current situation**: Analyzes unit positions, tower health, available resources, lane-by-lane threat distribution
2. **Evaluates strategic conditions**: Checks multiple conditions to identify critical game situations
3. **Runs RL simulations** (periodically): Tests hypothetical unit deployment strategies by simulating 12 game ticks into the future with 100 action samples
4. **Ranks recommendations**: Uses both rule-based heuristics and simulation results to score potential actions
5. **Generates explanations**: Creates human-readable reasoning for suggested tactics
6. **Transmits feedback**: Sends suggestions to the client for immediate display

### Strategic Assessment

The tutor evaluates conditions across multiple dimensions:

**Per-Lane Analysis**: The arena is divided into three lanes (left, center, right), and the tutor analyzes threat levels and unit concentrations in each lane separately. This enables lane-specific recommendations like "Defend Left Lane" or "Push Center."

**Threat Detection**: The system calculates:
- Proximity danger: How close are enemy units to your towers?
- Concentration threats: Are enemies bunching up in specific lanes?
- Resource advantage: Who has more total tower health?

**Elixir Efficiency**: The tutor detects wasteful hoarding patterns. If your Elixir is at or near maximum capacity (8+), the tutor recommends spending it immediately since held resources provide no benefit.

**Tower Status**: The tutor tracks individual tower health and alerts you to severe damage conditions (King Tower below 100 HP).

### Suggestion Structure

Each AI suggestion sent to the player includes three components:

- **Title**: Concise action label (e.g., "Defend Left Lane", "Big Push with Giant")
- **Reason**: Detailed explanation of the strategic reasoning, contextualized to the current game state
- **Confidence Score**: Numerical confidence (0-100) indicating how certain the AI is about this recommendation

This structure ensures players learn the reasoning behind suggestions, not just receive orders.

### RL Simulation Engine

The tutor uses reinforcement learning simulation to evaluate potential deployment strategies without requiring neural networks or extensive training. The process works as follows:

1. **State Cloning**: Creates a copy of the current game state
2. **Hypothesis Testing**: Simulates deploying different unit combinations
3. **Future Projection**: Runs the simulation forward 12 ticks (~1.2 seconds) to see outcomes
4. **Outcome Scoring**: Evaluates outcomes based on damage dealt, towers destroyed, units saved
5. **Ranking**: Sorts strategies by effectiveness and confidence
6. **Caching**: Results are cached for 6 seconds to avoid expensive recomputation

This approach provides adaptive, situation-aware recommendations that improve as the game evolves.

### Offline RL Training System

Beyond real-time tutor suggestions, the system includes an advanced **offline reinforcement learning training pipeline** that continuously improves decision-making:

**How It Works**:
- **Synthetic State Generation**: Creates diverse game scenarios representing different threat levels, resource states, and strategic situations
- **Action Evaluation**: For each state, tests all possible unit deployments and measures their effectiveness
- **Q-Table Building**: Stores state-action pairs and their expected rewards in a persistent Q-table
- **Reward Calculation**: Rewards are based on damage dealt, towers destroyed, units saved, and game outcomes

**Key Features**:
- **Persistent Storage**: Q-tables survive server restarts using atomic JSON file writes
- **Training Sessions**: Each training run is logged with metrics like number of simulations, average rewards, and coverage
- **Incremental Learning**: New training sessions build on previous Q-tables rather than starting from scratch
- **Session Tracking**: Records session history with reward trends and state coverage metrics

**Training Parameters**:
- **Horizon**: Number of ticks simulated per action evaluation (20 ticks by default)
- **Action Space**: Tests deployments across 8 strategic columns
- **State Discretization**: Game states are hashed into buckets (elixir levels, tower HP bands, unit positions)
- **Simulation Count**: Configurable number of synthetic states to train on (typically 1000+ per session)

---

## Server API and WebSocket Events

The system provides both REST API endpoints and WebSocket events for real-time communication between client and server.

### REST API Endpoints

These HTTP endpoints are available at http://localhost:3001:

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/` | GET | Server health check | `{ status: "AI RTS Tutor Server Running" }` |
| `/unit-types` | GET | Retrieve all available unit definitions | JSON object with unit stats, costs, descriptions |
| `/stats` | GET | Get current game statistics | `{ tick, stats, winner, gameOver }` - includes units deployed, towers destroyed, elixir spent per player |
| `/rl-stats` | GET | Get RL training metrics and Q-table status | `{ totalSimulations, totalSessions, coverageSize, avgRewardHistory, trainingLog }` |
| `/train-rl` | POST | Trigger offline RL training session | Accepts `{ simulations: number }`, returns training results and updated Q-table metrics |

### WebSocket Events

The system uses WebSocket connections to maintain real-time synchronized game state between client and server. All communication occurs asynchronously.

### Server-to-Client Events

These events are sent from the server to update the client about game state changes. The server broadcasts updates at a fixed interval (100ms per tick):

| Event Name | Frequency | Purpose | Data Payload |
|---|---|---|---|
| `INIT_STATE` | Once on connect | Initialize new client connection with game state | Complete game state, all unit types with full stats, latest suggestions, arena dimensions (18x10) |
| `GAME_UPDATE` | Every tick (100ms) | Update players about current game state | Tick counter, player resources (elixir), all active units with positions/health, tower status, game-over flag, game statistics |
| `TUTOR_SUGGESTION` | Every 3 seconds (~30 ticks)* | Send AI tutor recommendation | Title, detailed reason text, confidence score (0-100), recommended unit type, recommended lane |
| `ACTION_RESULT` | On-demand (player action) | Response to deployment attempt | Success flag, unit object (if successful) or error message (if failed) |

*RL simulation runs every 6 seconds for expensive strategy analysis; suggestions are throttled to 3-second intervals to avoid overwhelming players

### Client-to-Server Events

These events are sent from the client to communicate player actions to the server:

| Event Name | Trigger | Purpose | Data Payload |
|---|---|---|---|
| `PLAYER_ACTION` | Player clicks Deploy button | Deploy a unit to the arena | `{ type: unitType, col: columnNumber }` |
| `RESTART_GAME` | Player clicks Restart after game ends | Reset game and start fresh session | None (simple trigger signal) |

### Communication Flow Example

A typical game session follows this communication pattern:

1. Player opens http://localhost:5173 in browser (Vite dev server)
2. Client connects to server via WebSocket (socket.io-client connects to http://localhost:3001)
3. Server sends `INIT_STATE` with complete game configuration (units, towers, initial state, available suggestions)
4. **Game Loop** (repeating every 100ms):
   - Server executes `tickGameState()` — advances physics, moves units, resolves combat
   - Server runs `aiDecisionLogic()` — AI spawns its own units strategically
   - Server broadcasts `GAME_UPDATE` to all connected clients
5. **Tutor Cycle** (every 3 seconds, ~30 ticks):
   - Server calls `analyzeTick()` from tutor module
   - If RL simulation is due (every 60 ticks), runs complex strategy evaluation
   - Server generates suggestion based on current situation + RL results
   - Server broadcasts `TUTOR_SUGGESTION` to all clients
6. **Player Action** (when player clicks Deploy):
   - Client sends `PLAYER_ACTION` with unit type and column
   - Server validates action (checks elixir cost, game state validity)
   - Server calls `spawnUnit()` to create unit and deduct elixir
   - Server sends `ACTION_RESULT` with success/failure
   - Updated state is included in next `GAME_UPDATE` broadcast
7. **Game End** (when a King Tower is destroyed):
   - `tickGameState()` detects game-over condition and sets `gameOver: true`, `winner: "human"|"ai"`
   - Next `GAME_UPDATE` contains end-game state
   - Client displays game-over screen with restart button
   - Player clicks Restart → Client sends `RESTART_GAME`
   - Server runs `createGameState()` to reset all state
   - Cycle begins again from step 3

This event-driven architecture ensures low-latency, responsive gameplay even with complex AI calculations running server-side.

---

## RL Dashboard and Training Interface

The frontend includes a dedicated **RL Dashboard** component that provides visibility into the reinforcement learning training process and allows manual training execution.

### Dashboard Features

**Metrics Tab**:
- **Q-Table Growth**: Visual representation of state-action pair coverage
- **Average Reward Trend**: Graph showing reward improvement over training sessions
- **Total Simulations**: Counter of all training simulations run
- **Session Count**: Number of completed training sessions
- **Last Training Time**: Timestamp of most recent training session

**Training Log Tab**:
- **Session History**: Detailed list of all training sessions executed
- **Per-Session Metrics**: 
  - Simulation count for that session
  - Average reward achieved
  - New state-action pairs discovered
  - Completion timestamp

**Training Controls**:
- **Simulation Count Slider**: Adjust number of synthetic states to test (1-5000)
- **Run Training Button**: Trigger a new offline training session
- **Progress Indicator**: Real-time display of training progress during execution
- **Last Completion Status**: Summary of most recent training results

### Using the RL Dashboard

To access the RL Dashboard:
1. Start both backend and frontend servers
2. Open http://localhost:5173 in browser
3. Navigate to the RL Dashboard panel (or tab)
4. Set desired simulation count
5. Click "Run Training" to start an offline training session
6. Monitor progress and view historical results

The Q-table learned during training is immediately used to improve tutor suggestions in subsequent games, creating a feedback loop where gameplay improves the training data and the training improves gameplay suggestions.

The system tracks detailed game statistics to measure player and AI performance:

### Per-Player Statistics

For each player (human and AI), the system records:

- **Units Deployed**: Total number of units spawned during the game
- **Towers Destroyed**: Count of enemy towers that were destroyed
- **Elixir Spent**: Cumulative elixir used on unit deployments

These statistics can be retrieved via the `/stats` REST endpoint and are included in every `GAME_UPDATE` message, allowing the client to display real-time performance metrics.

### Event Logging

The game engine maintains an event log (limited to the last 200 events in memory) that tracks significant game occurrences:

- Unit spawns (type, owner, location)
- Unit deaths
- Tower damage and destruction
- Game state transitions
- AI decisions

This event log enables:
- **Replay analysis**: Understanding sequences of events that led to victory/defeat
- **Debugging**: Diagnosing unexpected game behavior
- **Educational value**: Analyzing decision patterns and their outcomes

---

## Development and Customization

The modular architecture makes it straightforward to extend and customize the system:

**Game Balance**: Modify unit stats (health, damage, speed, range), costs, or tower health values in [gameState.js](server/game/gameState.js) to adjust difficulty and gameplay dynamics

**AI Tutor Logic**: Update decision rules and RL simulation parameters in [tutor.js](server/tutor/tutor.js) to teach different strategies or focus on specific gameplay aspects. The RL simulation depth and sampling can be tuned.

**AI Opponent Behavior**: Modify `aiDecisionLogic()` in [gameState.js](server/game/gameState.js) to change how the AI opponent spawns units and responds to player actions

**Visual Customization**: Modify React components to change the UI appearance, layout, color scheme, or information displayed

**New Unit Types**: Add new entries to `UNIT_TYPES` in [gameState.js](server/game/gameState.js) with custom stats and special abilities

**Mechanics Extensions**: Add new combat mechanics, special abilities, map hazards, or game modes by extending the tick engine

---

## Performance Considerations

**Server Capacity**: The tick-based engine processes game logic at 10 ticks per second (100ms intervals). The RL simulation adds periodic (every 6 seconds) computational overhead. For optimal performance:
- Run server and client on the same machine or low-latency network
- Monitor server CPU usage during RL simulations
- Consider caching or memoization for frequently computed situations

**Client Rendering**: The browser renders the grid, units, and effects. For smooth experience:
- Use a modern browser with hardware acceleration enabled
- Avoid running other intensive tasks during gameplay
- On slower machines, consider reducing visual effects or grid resolution

---

## Troubleshooting

**Cannot connect to server**: 
- Ensure backend server is running (`npm start` in server/ directory)
- Verify server is listening on port 3001 (check terminal output)
- Check firewall settings if running on different machines
- Verify frontend is configured to connect to correct server URL

**Units not spawning or displaying**: 
- Check browser developer console (F12) for JavaScript errors
- Verify `GAME_UPDATE` events are being received (check Network tab WebSocket)
- Ensure Arena.jsx has correct grid dimensions (18x10)
- Check that units have valid x,y coordinates within grid bounds

**Tutor suggestions not appearing**: 
- Confirm tutor.js `analyzeTick()` is being called every tick
- Check that suggestions are not filtered out by cooldown timers
- Verify TutorPanel.jsx is listening for `TUTOR_SUGGESTION` events
- Check server logs for any errors during suggestion generation

**Gameplay feels slow or laggy**: 
- Check network latency (developer tools Network tab)
- Monitor server CPU and memory usage
- Reduce number of active units/entities if possible
- Ensure both server and client are on same or low-latency network
- Reduce rendering load by disabling non-essential visual effects

**Game state desyncs between client and server**: 
- Check for console errors during `GAME_UPDATE` processing
- Verify player hasn't missed an `ACTION_RESULT` response
- Consider network packet loss if on wifi
- Restart both client and server if desync persists

---

## Technology Stack

- **Backend**: 
  - Node.js runtime environment
  - Express.js web framework
  - Socket.IO for real-time WebSocket communication
  - RL system with Q-learning algorithm (offline training)
  
- **Frontend**: 
  - React 19 framework with custom hooks
  - Vite build tool and dev server
  - Socket.IO client for real-time updates
  - React components for game UI and RL dashboard
  
- **Data Storage**: 
  - JSON-based persistent Q-table storage for RL models
  - Training session logs and performance metrics
  - Event logs for replay and analysis

- **AI Architecture**: 
  - Rule-based heuristic engine for real-time suggestions
  - RL simulation engine for strategy evaluation
  - Offline Q-learning for model training
  - State discretization and hashing for efficient representation

---

## Future Extensions

Potential improvements and extensions to the system:

- **Neural Network Integration**: Replace Q-learning with neural networks (TensorFlow.js) for more sophisticated decision-making
- **Player Profiles**: Track individual player performance and adapt difficulty/suggestions per player
- **Multiplayer Competitive**: Support player-vs-player matches with ELO ranking system
- **Advanced RL Features**: Policy gradients, actor-critic methods, experience replay
- **Replay System**: Save and replay games using the event log for educational analysis and coaching
- **MongoDB Logging**: Persist game events, training sessions, and statistics to database
- **Player Dashboard**: Web interface showing win rates, learning progress, strategy effectiveness
- **Tournament Mode**: Seasonal tournaments with brackets and leaderboards
- **Unit Cosmetics**: Skins, animations, visual effects for enhanced engagement
- **Map Variations**: Different arena layouts, terrain, objectives
- **Mobile Optimization**: Responsive design for tablet and mobile play
