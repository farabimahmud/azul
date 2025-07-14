import { TILE_COLORS, TILES_PER_COLOR, NUM_PLAYERS, FACTORIES_PER_GAME, WALL_TEMPLATE, FLOOR_PENALTIES } from './constants.js';

export class GameLogic {
    static shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static createPlayerState(id, name, isAI = false, aiStrategy = null) {
        return {
            id: id,
            name: name,
            score: 0,
            isAI: isAI,
            aiStrategy: aiStrategy,
            patternLines: Array.from({ length: 5 }, (_, i) => ({ size: i + 1, tiles: [], color: null })),
            wall: Array(5).fill(null).map(() => Array(5).fill(false)),
            floorLine: [],
        };
    }

    static createInitialGameState(userId, numPlayers = NUM_PLAYERS) {
        const bag = [];
        TILE_COLORS.forEach(color => {
            for (let i = 0; i < TILES_PER_COLOR; i++) {
                bag.push(color);
            }
        });

        const players = [];
        players.push(this.createPlayerState(userId, `Player (You)`));

        // Top 100 English names for AI players
        const aiNames = [
            'James', 'Robert', 'John', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher',
            'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Kenneth',
            'Joshua', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan',
            'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
            'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
            'Lisa', 'Nancy', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
            'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen',
            'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah',
            'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma', 'Olivia', 'Cynthia', 'Marie', 'Janet', 'Catherine',
            'Frances', 'Christine', 'Samantha', 'Debra', 'Rachel', 'Carolyn', 'Janet', 'Virginia', 'Maria', 'Heather'
        ];

        // Fun emoji combinations
        const emojiCombos = [
            '🎨🎭', '🌟⚡', '🎯🔥', '🌈🦄', '🎪🎨', '🚀🌙', '🎵🎹', '🌸🦋', '🎲🎰', '🌊🐚',
            '🍀🌿', '🎪🎨', '🌺🦜', '🎯🏹', '🌟💫', '🎭🎪', '🔮✨', '🌙⭐', '🎨🖌️', '🎵🎶',
            '🌈🌟', '🦄🌸', '🔥⚡', '🌊🌺', '🎲🃏', '🎯🎪', '🌙💫', '🎨🌟', '🦋🌸', '🎭🔮',
            '🌺🎪', '⚡🎯', '🦜🌸', '🌟🎨', '🎰🎲', '🐚🌊', '🌿🍀', '🦋🌺', '🎹🎵', '💫🌙',
            '🖌️🎨', '🎶🎵', '🃏🎲', '🏹🎯', '✨🔮', '⭐🌙', '🎪🎭', '🌸🦄', '🔥🌟', '🐚🌺'
        ];

        const aiStrategies = ['greedy', 'defensive', 'wall-focused'];
        const shuffledNames = this.shuffle([...aiNames]);
        const shuffledEmojis = this.shuffle([...emojiCombos]);
        const shuffledStrategies = this.shuffle([...aiStrategies]);

        for (let i = 1; i < numPlayers; i++) {
            const name = shuffledNames[i - 1];
            const emoji = shuffledEmojis[i - 1];
            const strategy = shuffledStrategies[(i - 1) % shuffledStrategies.length];
            
            players.push(this.createPlayerState(`AI-${i}`, `${name} ${emoji}`, true, strategy));
        }

        const initialState = {
            bag: this.shuffle(bag),
            players: players,
            factories: [],
            center: [],
            round: 1,
            currentPlayerIndex: 0,
            firstPlayerTokenHolder: null,
            isRoundOver: false,
            isGameOver: false,
            discardPile: [],
        };

        this.setupNewRound(initialState);
        return initialState;
    }

    static setupNewRound(state) {
        const numFactories = FACTORIES_PER_GAME[state.players.length] || FACTORIES_PER_GAME[4];
        state.factories = Array.from({ length: numFactories }, () => []);

        for (let i = 0; i < numFactories; i++) {
            for (let j = 0; j < 4; j++) {
                if (state.bag.length === 0) {
                    if (state.discardPile.length === 0) break;
                    state.bag = this.shuffle(state.discardPile);
                    state.discardPile = [];
                }
                state.factories[i].push(state.bag.pop());
            }
        }

        state.center = [];
        state.isRoundOver = false;
        
        if (state.firstPlayerTokenHolder !== null) {
            state.currentPlayerIndex = state.players.findIndex(p => p.id === state.firstPlayerTokenHolder);
            if(state.currentPlayerIndex === -1) state.currentPlayerIndex = 0;
            state.center.push('first');
        } else {
             state.currentPlayerIndex = Math.floor(Math.random() * state.players.length);
        }
    }

    static checkRoundEnd(gameState) {
        return Array.isArray(gameState.factories) && 
               gameState.factories.every(f => f.length === 0) && 
               gameState.center.length === 0;
    }

    static endRound(gameState) {
        gameState.isRoundOver = true;

        for (const player of gameState.players) {
            let floorPenalty = 0;
            for (let i = 0; i < player.patternLines.length; i++) {
                const line = player.patternLines[i];
                if (line.tiles.length === line.size) {
                    const color = line.color;
                    const wallRow = i;
                    const wallCol = WALL_TEMPLATE[wallRow].indexOf(color);

                    if (player.wall && !player.wall[wallRow][wallCol]) {
                        player.wall[wallRow][wallCol] = true;
                        player.score += this.calculateTileScore(player.wall, wallRow, wallCol);
                        gameState.discardPile.push(...line.tiles.slice(1));
                    } else {
                        gameState.discardPile.push(...line.tiles);
                    }
                    line.tiles = [];
                    line.color = null;
                }
            }
            
            player.floorLine.forEach((tile, index) => {
                if (tile !== 'first') {
                   floorPenalty += FLOOR_PENALTIES[Math.min(index, FLOOR_PENALTIES.length - 1)];
                }
            });
            player.score = Math.max(0, player.score + floorPenalty);
            
            const floorTilesToDiscard = player.floorLine.filter(t => t !== 'first');
            gameState.discardPile.push(...floorTilesToDiscard);
            player.floorLine = [];
        }
        
        if (gameState.players.some(p => p.wall && p.wall.some(row => row.every(tile => tile)))) {
            gameState.isGameOver = true;
            console.log("🏁 Game ending - player completed a row!");
            this.endGame(gameState);
        } else {
            gameState.round++;
            this.setupNewRound(gameState);
        }
    }

    static endGame(gameState) {
        console.log("🎯 Ending game and calculating final scores...");
        for (const player of gameState.players) {
            if(!player.wall) continue;
            let bonus = 0;
            
            for (let i = 0; i < 5; i++) {
                if (player.wall[i].every(t => t)) bonus += 2;
            }
            
            for (let j = 0; j < 5; j++) {
                let colComplete = true;
                for (let i = 0; i < 5; i++) {
                    if (!player.wall[i][j]) colComplete = false;
                }
                if (colComplete) bonus += 7;
            }
            
            for (const color of TILE_COLORS) {
                let colorCount = 0;
                for (let i = 0; i < 5; i++) {
                    for (let j = 0; j < 5; j++) {
                        if (player.wall[i][j] && WALL_TEMPLATE[i][j] === color) {
                            colorCount++;
                        }
                    }
                }
                if (colorCount === 5) bonus += 10;
            }
            player.score += bonus;
        }
        gameState.isGameOver = true;
        console.log("✅ Game over state set to true, final scores calculated");
    }

    static calculateTileScore(wall, r, c) {
        let score = 0;
        let horizontal = 1;
        
        for (let i = c - 1; i >= 0 && wall[r][i]; i--) horizontal++;
        for (let i = c + 1; i < 5 && wall[r][i]; i++) horizontal++;

        let vertical = 1;
        for (let i = r - 1; i >= 0 && wall[i][c]; i--) vertical++;
        for (let i = r + 1; i < 5 && wall[i][c]; i++) vertical++;
        
        if (horizontal > 1 && vertical > 1) {
            score = horizontal + vertical;
        } else if (horizontal > 1) {
            score = horizontal;
        } else if (vertical > 1) {
            score = vertical;
        } else {
            score = 1;
        }
        return score;
    }

    static placeTilesOnBoard(gameState, color, count, patternLineIndex) {
        const player = gameState.players[gameState.currentPlayerIndex];
        
        if (patternLineIndex === -1) {
            for(let i = 0; i < count; i++) {
                if(player.floorLine.length < 7) player.floorLine.push(color);
                else gameState.discardPile.push(color);
            }
        } else {
            const line = player.patternLines[patternLineIndex];
            line.color = color;
            const spaceAvailable = line.size - line.tiles.length;
            const tilesToPlace = Math.min(count, spaceAvailable);
            const tilesForFloor = count - tilesToPlace;

            for (let i = 0; i < tilesToPlace; i++) line.tiles.push(color);
            for (let i = 0; i < tilesForFloor; i++) {
                if(player.floorLine.length < 7) player.floorLine.push(color);
                else gameState.discardPile.push(color);
            }
        }
    }

    static nextTurn(gameState) {
        if (this.checkRoundEnd(gameState)) {
            this.endRound(gameState);
            return true; // Round ended
        } else {
            gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
            return false; // Continue round
        }
    }
}
