# Azul Game

A digital version of the popular board game Azul, built with vanilla JavaScript and deployed on Vercel.

## Features

- 🎮 Full implementation of Azul board game rules
- 🤖 AI opponents with different strategies (greedy, defensive, wall-focused)
- 🔥 Real-time multiplayer using Firebase
- 📱 Responsive design with Tailwind CSS
- 🎨 Beautiful tile-based UI

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth
- **Build Tool**: Vite
- **Deployment**: Vercel

## Project Structure

```
azul/
├── src/
│   ├── js/
│   │   ├── azul-game.js      # Main game controller
│   │   ├── firebase-service.js  # Firebase integration
│   │   ├── game-logic.js     # Core game mechanics
│   │   ├── game-renderer.js  # UI rendering
│   │   ├── ai-player.js      # AI strategies
│   │   └── constants.js      # Game constants
│   ├── styles/
│   │   └── main.css          # Game styles
│   └── main.js               # Entry point
├── index.html                # Main HTML file
├── package.json
├── vite.config.js
└── vercel.json              # Vercel deployment config
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Firebase project (for multiplayer features)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo>
   cd azul
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore
   - Enable Anonymous Authentication
   - Add your Firebase config to the global variables in `index.html` or set up environment variables

4. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
```

### Deployment to Vercel

The project is configured for Vercel deployment. Simply connect your GitHub repository to Vercel or use the Vercel CLI:

```bash
npm install -g vercel
vercel
```

## Game Rules

Azul is a tile-laying game where players compete to create the most beautiful wall. The game consists of:

1. **Factory Phase**: Players draft tiles from factories or the center
2. **Wall-tiling Phase**: Complete pattern lines are moved to the wall
3. **Scoring**: Points are awarded based on tile placement patterns

### Scoring

- **Tile Placement**: 1-5+ points based on adjacent tiles
- **End Game Bonuses**:
  - Complete horizontal row: 2 points
  - Complete vertical column: 7 points
  - Complete color set: 10 points

## AI Strategies

The game includes three AI personalities:

- **Greedy**: Focuses on immediate tile collection and line completion
- **Defensive**: Prioritizes avoiding penalties and blocking opponents
- **Wall-focused**: Emphasizes long-term wall pattern building

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes. Azul is a trademark of Plan B Games.
