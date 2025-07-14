import { WALL_TEMPLATE, FLOOR_PENALTIES } from './constants.js';

export class AIPlayer {
    static chooseBestMove(player, gameState) {
        const possibleMoves = [];
        if (!Array.isArray(gameState.factories)) return null;

        gameState.factories.forEach((factory, factoryIndex) => {
            if (factory.length === 0) return;
            const uniqueColors = [...new Set(factory)];
            uniqueColors.forEach(color => {
                const count = factory.filter(t => t === color).length;
                possibleMoves.push(...this.evaluateMoveOptions(player, gameState, { source: 'factory', index: factoryIndex, color, count }));
            });
        });

        const uniqueColorsCenter = [...new Set(gameState.center.filter(t => t !== 'first'))];
        uniqueColorsCenter.forEach(color => {
            const count = gameState.center.filter(t => t === color).length;
            possibleMoves.push(...this.evaluateMoveOptions(player, gameState, { source: 'center', color, count }));
        });
        
        if (possibleMoves.length === 0) return null;

        possibleMoves.sort((a, b) => b.score - a.score);
        
        const bestScore = possibleMoves[0].score;
        const bestMoves = possibleMoves.filter(m => m.score === bestScore);

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    static evaluateMoveOptions(player, gameState, move) {
        const options = [];
        if(!player.wall) return [];
        
        for (let i = 0; i < 5; i++) {
            const line = player.patternLines[i];
            if (line.color === null || line.color === move.color) {
                const wallCol = WALL_TEMPLATE[i].indexOf(move.color);
                if (!player.wall[i][wallCol]) {
                    const score = this.calculateMoveScore(player, gameState, move, i);
                    options.push({ ...move, targetLine: i, score });
                }
            }
        }
        
        const floorScore = this.calculateMoveScore(player, gameState, move, -1);
        options.push({ ...move, targetLine: -1, score: floorScore });
        
        return options;
    }
    
    static calculateMoveScore(player, gameState, move, targetLineIndex) {
        let score = 0;
        const { count, color } = move;
        
        let tilesToPlace, tilesForFloor;
        if (targetLineIndex === -1) {
            tilesToPlace = 0;
            tilesForFloor = count;
        } else {
            const line = player.patternLines[targetLineIndex];
            const spaceAvailable = line.size - line.tiles.length;
            tilesToPlace = Math.min(count, spaceAvailable);
            tilesForFloor = count - tilesToPlace;
        }
        
        const takesFirstPlayerToken = move.source === 'center' && gameState.center.includes('first');
        const currentFloorCount = player.floorLine.length;
        const totalFloorTiles = tilesForFloor + (takesFirstPlayerToken ? 1 : 0);
        
        let floorPenalty = 0;
        for (let i = 0; i < totalFloorTiles; i++) {
            const floorIndex = currentFloorCount + i;
            floorPenalty += FLOOR_PENALTIES[Math.min(floorIndex, FLOOR_PENALTIES.length - 1)] || 0;
        }

        switch (player.aiStrategy) {
            case 'greedy':
                score += tilesToPlace * 2;
                if (targetLineIndex !== -1 && player.patternLines[targetLineIndex].tiles.length + tilesToPlace === targetLineIndex + 1) {
                    score += 5;
                }
                score += floorPenalty;
                break;

            case 'defensive':
                score += tilesToPlace;
                score += floorPenalty * 2;
                if(move.source === 'factory') {
                    const remaining = gameState.factories[move.index].filter(t => t !== color);
                    if(remaining.length > 0 && new Set(remaining).size === 1) {
                        score -= 2;
                    }
                }
                break;

            case 'wall-focused':
                score += tilesToPlace;
                if (targetLineIndex !== -1 && player.wall) {
                    const wallCol = WALL_TEMPLATE[targetLineIndex].indexOf(color);
                    let colCount = 0;
                    for(let i=0; i<5; i++) {
                        if(player.wall[i][wallCol]) colCount++;
                    }
                    score += colCount * 2;

                    let colorOnWallCount = 0;
                    for(let r=0; r<5; r++) {
                        for(let c=0; c<5; c++) {
                            if(player.wall[r][c] && WALL_TEMPLATE[r][c] === color) {
                                colorOnWallCount++;
                            }
                        }
                    }
                    score += (4 - colorOnWallCount);
                }
                score += floorPenalty;
                break;
        }
        
        if (takesFirstPlayerToken && (gameState.center.length > 1 || (Array.isArray(gameState.factories) && gameState.factories.some(f => f.length > 0)))) {
            score -= 2;
        }

        return score;
    }

    static performMove(gameState, move) {
        const { source, index, color, count, targetLine } = move;
        const player = gameState.players[gameState.currentPlayerIndex];

        if (source === 'factory') {
            const factory = gameState.factories[index];
            const remaining = factory.filter(t => t !== color);
            gameState.factories[index] = [];
            gameState.center.push(...remaining);
        } else {
            gameState.center = gameState.center.filter(t => t !== color);
            if (gameState.center.includes('first')) {
                player.floorLine.push('first');
                gameState.center = gameState.center.filter(t => t !== 'first');
                gameState.firstPlayerTokenHolder = player.id;
            }
        }

        return { color, count, targetLine };
    }
}
