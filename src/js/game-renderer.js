import { WALL_TEMPLATE, FLOOR_PENALTIES } from './constants.js';

export class GameRenderer {
    constructor() {
        this.factoriesContainer = document.getElementById('factories-container');
        this.centerContainer = document.getElementById('center-container');
        this.playersContainer = document.getElementById('players-container');
        this.roundNumberEl = document.getElementById('round-number');
        this.currentPlayerNameEl = document.getElementById('current-player-name');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.finalScoresEl = document.getElementById('final-scores');
        this.userIdEl = document.getElementById('user-id');
        this.gameIdEl = document.getElementById('game-id');
    }

    setUserInfo(userId, gameId) {
        this.userIdEl.textContent = userId;
        this.gameIdEl.textContent = gameId;
        
        // Hide the entire Game ID paragraph for local games
        if (gameId === 'local-game') {
            this.gameIdEl.parentElement.style.display = 'none';
        } else {
            this.gameIdEl.parentElement.style.display = 'block';
        }
    }

    renderGame(gameState, userId, onTileSelection) {
        if (!gameState || !gameState.players) return;
        
        const me = gameState.players.find(p => p.id === userId);
        if (!me) {
            this.playersContainer.innerHTML = `<div class="text-center col-span-full">Waiting to join game...</div>`;
            return;
        }

        this.renderFactories(gameState, userId, onTileSelection);
        this.renderPlayers(gameState);

        this.roundNumberEl.textContent = gameState.round;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        this.currentPlayerNameEl.textContent = currentPlayer ? currentPlayer.name : 'Unknown';
        
        if (gameState.isGameOver) {
            this.renderGameOver(gameState);
        } else {
            // Only hide the game over modal if the game is actually active
            this.gameOverModal.classList.add('hidden');
        }
    }
    
    renderFactories(gameState, userId, onTileSelection) {
        this.factoriesContainer.innerHTML = '';
        if (!Array.isArray(gameState.factories)) return;
        
        gameState.factories.forEach((factory, index) => {
            const factoryDiv = document.createElement('div');
            factoryDiv.className = 'factory';
            factory.forEach(color => {
                const tile = this.createTileElement(color, 'factory', index, gameState, userId, onTileSelection);
                factoryDiv.appendChild(tile);
            });
            this.factoriesContainer.appendChild(factoryDiv);
        });

        this.centerContainer.innerHTML = '';
        const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === userId;
        
        const centerGroups = {};
        gameState.center.forEach(color => {
            if (!centerGroups[color]) centerGroups[color] = 0;
            centerGroups[color]++;
        });

        Object.entries(centerGroups).forEach(([color, count]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'flex gap-1';
            if (isMyTurn && !gameState.isRoundOver) {
                groupDiv.classList.add('cursor-pointer');
                groupDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onTileSelection('center', null, color);
                });
            }

            for (let i = 0; i < count; i++) {
                const tile = this.createTileElement(color, 'center', null, gameState, userId, onTileSelection, false);
                groupDiv.appendChild(tile);
            }
            this.centerContainer.appendChild(groupDiv);
        });
    }

    createTileElement(color, source, sourceIndex, gameState, userId, onTileSelection, isInteractive = true) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${color}`;
        if (color === 'first') {
            tile.textContent = '1st';
        }
        
        const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === userId;
        if (isInteractive && isMyTurn && !gameState.isRoundOver && color !== 'first') {
            tile.addEventListener('click', (e) => {
                e.stopPropagation();
                onTileSelection(source, sourceIndex, color);
            });
        } else {
            tile.style.cursor = 'default';
        }
        return tile;
    }

    renderPlayers(gameState) {
        this.playersContainer.innerHTML = '';
        gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-board';
            if (player.id === gameState.players[gameState.currentPlayerIndex]?.id && !gameState.isGameOver) {
                playerDiv.classList.add('current-turn');
            }

            let patternHTML = '';
            player.patternLines.forEach((line, index) => {
                const tilesHTML = Array(line.size).fill(0).map((_, i) => {
                    if (i < line.tiles.length) {
                        return `<div class="tile tile-${line.color}"></div>`;
                    }
                    return `<div class="w-8 h-8 md:w-8 md:h-8 sm:w-5 sm:h-5 bg-gray-200 rounded"></div>`;
                }).reverse().join('');
                patternHTML += `<div class="pattern-line mb-1" data-line-index="${index}">${tilesHTML}</div>`;
            });

            let wallHTML = '';
            if(player.wall && Array.isArray(player.wall)){
                player.wall.forEach((row, rIndex) => {
                    const rowHTML = row.map((isFilled, cIndex) => {
                        const color = WALL_TEMPLATE[rIndex][cIndex];
                        if (isFilled) {
                            return `<div class="wall-tile filled tile-${color}"></div>`;
                        }
                        return `<div class="wall-tile wall-bg-${color}"></div>`;
                    }).join('');
                    wallHTML += `<div class="flex gap-1 mb-1">${rowHTML}</div>`;
                });
            }
            
            let floorHTML = '';
            const floorPenaltiesHTML = FLOOR_PENALTIES.map(p => `<div class="text-center text-xs text-red-500 w-8 md:w-8 sm:w-5">${p}</div>`).join('');
            player.floorLine.forEach(tile => {
                floorHTML += `<div class="tile ${tile === 'first' ? 'tile-first' : `tile-${tile}`}">${tile === 'first' ? '1st' : ''}</div>`;
            });

            playerDiv.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">${player.name}</h3>
                    <div class="text-2xl font-bold">${player.score}</div>
                </div>
                <div class="flex gap-4">
                    <div class="flex-grow">
                        <h4 class="text-sm font-medium text-center mb-2">Pattern Lines</h4>
                        ${patternHTML}
                    </div>
                    <div class="w-px bg-gray-300"></div>
                    <div>
                        <h4 class="text-sm font-medium text-center mb-2">Wall</h4>
                        ${wallHTML}
                    </div>
                </div>
                <div class="mt-4">
                    <h4 class="text-sm font-medium mb-2">Floor Line</h4>
                    <div class="floor-line">${floorHTML}</div>
                    <div class="flex gap-0.25 mt-1">${floorPenaltiesHTML}</div>
                </div>
            `;
            this.playersContainer.appendChild(playerDiv);
        });
    }
    
    renderPatternLineSelection(player, color, count, onPlacement) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        let patternLinesHTML = '';
        player.patternLines.forEach((line, index) => {
            const isColorMismatch = line.color && line.color !== color;
            const isLineFull = line.tiles.length === line.size;
            const isWallTileFilled = player.wall && player.wall[index][WALL_TEMPLATE[index].indexOf(color)];
            
            const isDisabled = isColorMismatch || isLineFull || isWallTileFilled;
            
            patternLinesHTML += `
                <button class="w-full text-left p-2 border rounded mb-2 ${isDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-blue-100'}" 
                        data-line-index="${index}" ${isDisabled ? 'disabled' : ''}>
                    Row ${index + 1}: (${line.tiles.length}/${line.size}) ${isDisabled ? (isWallTileFilled ? '- Color already on wall' : '- Invalid') : ''}
                </button>
            `;
        });
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2 class="text-xl font-bold mb-4">Place ${count} <span class="capitalize">${color}</span> tile(s)</h2>
                <div class="flex items-center justify-center mb-4">
                    ${Array(count).fill(`<div class="tile tile-${color} mx-1"></div>`).join('')}
                </div>
                <div>
                    ${patternLinesHTML}
                    <button class="w-full text-left p-2 border rounded mb-2 bg-red-100 hover:bg-red-200" data-line-index="-1">
                        Place on Floor Line
                    </button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const lineIndex = parseInt(e.target.dataset.lineIndex);
                onPlacement(lineIndex);
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }

    renderGameOver(gameState) {
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        let scoresHTML = sortedPlayers.map((p, index) => `
            <div class="flex justify-between p-2 ${index === 0 ? 'font-bold text-green-600' : ''}">
                <span>${index + 1}. ${p.name}</span>
                <span>${p.score} points</span>
            </div>
        `).join('');
        this.finalScoresEl.innerHTML = scoresHTML;
        
        // Remove both hidden class and inline display style to show the modal
        this.gameOverModal.classList.remove('hidden');
        this.gameOverModal.style.display = 'flex';
    }
}
