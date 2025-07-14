import './styles/main.css';
import { AzulGame } from './js/azul-game.js';

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    let selectedPlayerCount = 4; // Default to 4 players
    
    // Handle player count selection
    const playerCountButtons = document.querySelectorAll('.player-count-btn');
    const selectedPlayerCountDisplay = document.getElementById('selected-player-count');
    
    playerCountButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            playerCountButtons.forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            
            // Add active class to clicked button
            button.classList.remove('bg-gray-200', 'text-gray-700');
            button.classList.add('bg-blue-600', 'text-white');
            
            // Update selected player count
            selectedPlayerCount = parseInt(button.dataset.players);
            selectedPlayerCountDisplay.textContent = selectedPlayerCount;
        });
    });
    
    const game = new AzulGame();
    game.initialize(selectedPlayerCount, () => selectedPlayerCount);
});
