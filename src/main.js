import './styles/main.css';
import { AzulGame } from './js/azul-game.js';

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new AzulGame();
    game.initialize();
});
