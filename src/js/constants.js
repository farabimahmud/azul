// Game Constants
export const TILE_COLORS = ['blue', 'yellow', 'red', 'black', 'teal'];
export const TILES_PER_COLOR = 20;
export const NUM_PLAYERS = 4;
export const FACTORIES_PER_GAME = { 2: 5, 3: 7, 4: 9 };
export const WALL_TEMPLATE = [
    ['blue', 'yellow', 'red', 'black', 'teal'],
    ['teal', 'blue', 'yellow', 'red', 'black'],
    ['black', 'teal', 'blue', 'yellow', 'red'],
    ['red', 'black', 'teal', 'blue', 'yellow'],
    ['yellow', 'red', 'black', 'teal', 'blue']
];
export const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];
