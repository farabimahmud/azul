import FirebaseService from './firebase-service.js';
import { GameLogic } from './game-logic.js';
import { AIPlayer } from './ai-player.js';
import { GameRenderer } from './game-renderer.js';

export class AzulGame {
    constructor() {
        this.firebaseService = new FirebaseService();
        this.gameRenderer = new GameRenderer();
        this.gameState = {};
        this.isLocalMode = false;
        this.getPlayerCount = null; // Function to get current player count
        
        this.initializeEventListeners();
    }

    async initialize(initialPlayerCount = 4, getPlayerCountFn = null) {
        this.getPlayerCount = getPlayerCountFn || (() => initialPlayerCount);
        
        // Check if we're in development mode (no proper Firebase config)
        const firebaseConfig = typeof window.__firebase_config !== 'undefined' 
            ? JSON.parse(window.__firebase_config) 
            : { apiKey: "YOUR_API_KEY", authDomain: "YOUR_AUTH_DOMAIN", projectId: "YOUR_PROJECT_ID" };
        
        const appId = typeof window.__app_id !== 'undefined' 
            ? window.__app_id 
            : 'azul-default-game';

        // Check if Firebase config is valid (not placeholder values)
        const isValidFirebaseConfig = firebaseConfig.apiKey !== "YOUR_API_KEY" && 
                                    firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" && 
                                    firebaseConfig.projectId !== "YOUR_PROJECT_ID";

        if (isValidFirebaseConfig) {
            // Use Firebase for multiplayer
            this.firebaseService.initialize(firebaseConfig, appId);
            
            this.firebaseService.onAuthStateChanged(async (user) => {
                if (user) {
                    this.gameRenderer.setUserInfo(
                        this.firebaseService.getUserId(), 
                        this.firebaseService.getGameId()
                    );
                    await this.joinOrCreateGame();
                }
            });
        } else {
            // Local development mode - prepare for local game but don't start it yet
            console.log("Running in local development mode (no Firebase)");
            this.isLocalMode = true;
            this.gameRenderer.setUserInfo("local-player", "local-game");
            // Don't start the game automatically - wait for user to click "Play Game"
        }
    }

    initializeEventListeners() {
        const homepage = document.getElementById('homepage');
        const gameContainer = document.getElementById('game-container');
        const playGameBtn = document.getElementById('play-game-btn');
        const newGameBtn = document.getElementById('new-game-btn');

        playGameBtn.addEventListener('click', () => {
            homepage.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            
            // Force hide the game over modal
            const gameOverModal = document.getElementById('game-over-modal');
            if (gameOverModal) {
                gameOverModal.classList.add('hidden');
                gameOverModal.style.display = 'none';
            }
            
            if (this.isLocalMode) {
                // Start local game immediately
                this.startLocalGame();
            } else {
                this.firebaseService.authenticate();
            }
        });

        newGameBtn.addEventListener('click', () => {
            this.startNewGame();
        });

        // Add a temporary cheat button for testing game over (remove in production)
        if (this.isLocalMode) {
            setTimeout(() => {
                const gameContainer = document.getElementById('game-container');
                if (gameContainer && !document.getElementById('cheat-end-game')) {
                    const cheatBtn = document.createElement('button');
                    cheatBtn.id = 'cheat-end-game';
                    cheatBtn.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-sm';
                    cheatBtn.textContent = 'End Game (Test)';
                    cheatBtn.addEventListener('click', () => {
                        console.log("🎮 Forcing game to end for testing...");
                        this.gameState.isGameOver = true;
                        this.gameRenderer.renderGame(this.gameState, "local-player", this.handleTileSelection.bind(this));
                    });
                    document.body.appendChild(cheatBtn);
                }
            }, 2000);
        }
    }

    startLocalGame() {
        // Ensure game over modal is hidden with multiple methods
        const gameOverModal = document.getElementById('game-over-modal');
        if (gameOverModal) {
            gameOverModal.classList.add('hidden');
            gameOverModal.style.display = 'none';
        }
        
        const playerCount = this.getPlayerCount ? this.getPlayerCount() : 4;
        const initialState = GameLogic.createInitialGameState("local-player", playerCount);
        this.gameState = initialState;
        this.gameRenderer.renderGame(this.gameState, "local-player", this.handleTileSelection.bind(this));
        this.checkForAITurn();
    }

    async joinOrCreateGame() {
        if (this.isLocalMode) {
            // In local mode, we don't need Firebase
            return;
        }
        
        this.firebaseService.subscribeToGameState((receivedState) => {
            if (receivedState) {
                this.gameState = receivedState;
                const userId = this.firebaseService.getUserId();
                const isPlayerInGame = this.gameState.players.some(p => p.id === userId);

                if (isPlayerInGame) {
                    this.gameRenderer.renderGame(this.gameState, userId, this.handleTileSelection.bind(this));
                    this.checkForAITurn();
                } else if (this.gameState.players.length < 4) {
                    this.addPlayerToGame();
                } else {
                    this.gameRenderer.playersContainer.innerHTML = 
                        `<div class="text-center col-span-full">This game is full. You are spectating.</div>`;
                    this.gameRenderer.renderGame(this.gameState, userId, () => {});
                }
            } else {
                this.startNewGame();
            }
        });
    }

    async addPlayerToGame() {
        if (!Array.isArray(this.gameState.players)) {
            this.gameState.players = [];
        }
        const userId = this.firebaseService.getUserId();
        const humanPlayer = GameLogic.createPlayerState(userId, `Player (You)`);
        this.gameState.players.push(humanPlayer);
        await this.firebaseService.updateGameState(this.gameState);
    }

    startNewGame() {
        document.getElementById('game-over-modal').classList.add('hidden');
        if (this.isLocalMode) {
            this.startLocalGame();
        } else {
            const userId = this.firebaseService.getUserId();
            const playerCount = this.getPlayerCount ? this.getPlayerCount() : 4;
            const initialState = GameLogic.createInitialGameState(userId, playerCount);
            this.firebaseService.updateGameState(initialState);
        }
    }

    async handleTileSelection(source, sourceIndex, color) {
        const userId = this.isLocalMode ? "local-player" : this.firebaseService.getUserId();
        const player = this.gameState.players[this.gameState.currentPlayerIndex];
        
        if (player.id !== userId || this.gameState.isRoundOver) return;

        let takenTiles = [];
        let remainingTiles = [];

        // Store original state for potential cancellation
        const originalFactories = this.gameState.factories.map(f => [...f]);
        const originalCenter = [...this.gameState.center];
        const originalPlayerFloorLine = [...player.floorLine];
        const originalFirstPlayerTokenHolder = this.gameState.firstPlayerTokenHolder;

        if (source === 'factory') {
            const factory = this.gameState.factories[sourceIndex];
            takenTiles = factory.filter(t => t === color);
            remainingTiles = factory.filter(t => t !== color);
            this.gameState.factories[sourceIndex] = [];
            this.gameState.center.push(...remainingTiles);
        } else {
            takenTiles = this.gameState.center.filter(t => t === color);
            this.gameState.center = this.gameState.center.filter(t => t !== color);
            if (this.gameState.center.includes('first')) {
                player.floorLine.push('first');
                this.gameState.center = this.gameState.center.filter(t => t !== 'first');
                this.gameState.firstPlayerTokenHolder = player.id;
            }
        }
        
        if (takenTiles.length === 0) return;

        this.gameRenderer.renderPatternLineSelection(
            player, 
            color, 
            takenTiles.length, 
            (patternLineIndex) => this.placeTilesOnBoard(color, takenTiles.length, patternLineIndex),
            () => {
                // Cancel callback - restore original state
                this.gameState.factories = originalFactories;
                this.gameState.center = originalCenter;
                player.floorLine = originalPlayerFloorLine;
                this.gameState.firstPlayerTokenHolder = originalFirstPlayerTokenHolder;
                
                // Re-render the game to show the restored state
                const userId = this.isLocalMode ? "local-player" : this.firebaseService.getUserId();
                this.gameRenderer.renderGame(this.gameState, userId, this.handleTileSelection.bind(this));
            }
        );
    }
    
    async placeTilesOnBoard(color, count, patternLineIndex) {
        GameLogic.placeTilesOnBoard(this.gameState, color, count, patternLineIndex);
        await this.nextTurn();
    }

    async nextTurn() {
        const roundEnded = GameLogic.nextTurn(this.gameState);
        if (this.isLocalMode) {
            // In local mode, just re-render and continue
            this.gameRenderer.renderGame(this.gameState, "local-player", this.handleTileSelection.bind(this));
            this.checkForAITurn();
        } else {
            await this.firebaseService.updateGameState(this.gameState);
        }
    }

    checkForAITurn() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        const userId = this.isLocalMode ? "local-player" : this.firebaseService.getUserId();
        
        if (currentPlayer && currentPlayer.isAI && currentPlayer.id !== userId && !this.gameState.isRoundOver) {
            this.runAITurn(currentPlayer);
        }
    }

    runAITurn(player) {
        setTimeout(async () => {
            const move = AIPlayer.chooseBestMove(player, this.gameState);
            if (move) {
                const placement = AIPlayer.performMove(this.gameState, move);
                GameLogic.placeTilesOnBoard(this.gameState, placement.color, placement.count, placement.targetLine);
                await this.nextTurn();
            } else {
                console.error("AI could not find a move!");
                await this.nextTurn();
            }
        }, 1500);
    }
}
