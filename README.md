# Battleship Game

A browser-based Battleship game built with pure HTML, CSS, and JavaScript. Play against an AI opponent that uses a hunt-and-target strategy.

## Live Demo

**[Play Battleship]([https://natekanat-99.github.io/battleship-game/](https://battleship-game-rjzfzwkq.devinapps.com/))**

## Features

- **Ship Placement**: Manually place all 5 standard ships (Carrier, Battleship, Cruiser, Submarine, Destroyer) with rotation support, or use random placement
- **Hunt-and-Target AI**: The AI randomly hunts until it scores a hit, then targets adjacent cells to sink your ships
- **Visual Feedback**: Hits (red), misses (grey dot), and sunk ships (dark red) clearly marked on both grids
- **Fleet Status**: Track which ships are still afloat or sunk for both players
- **Win/Loss Detection**: Game-over overlay with victory or defeat message
- **Responsive Design**: Works on different screen sizes

## How to Play

1. Place your ships on the grid by clicking cells (use "Rotate" to switch orientation)
2. Click "Start Game" when all ships are placed
3. Click on the enemy grid to attack
4. The AI will respond with its own attack after each of your turns
5. Sink all enemy ships to win!

## Files

- `index.html` - Game structure and layout
- `style.css` - Styling and visual design
- `game.js` - All game logic (placement, attacks, AI, win/loss)

## Bug Report

A detailed bug report documenting all issues found and fixed during development is available here:

**[BUG_REPORT.md](BUG_REPORT.md)**
