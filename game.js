// ============================================================
// Battleship Game — Pure HTML/CSS/JS
// ============================================================

(function () {
    'use strict';

    // ----- Constants -----
    const GRID_SIZE = 10;
    const SHIPS = [
        { name: 'Carrier', size: 5 },
        { name: 'Battleship', size: 4 },
        { name: 'Cruiser', size: 3 },
        { name: 'Submarine', size: 3 },
        { name: 'Destroyer', size: 2 },
    ];
    const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    // Cell states
    const EMPTY = 0;
    const SHIP = 1;
    const HIT = 2;
    const MISS = 3;
    const SUNK = 4;

    // ----- State -----
    let placementOrientation = 'horizontal'; // horizontal | vertical
    let currentShipIndex = 0; // index into SHIPS for placement
    let placedShips = []; // [{name, size, cells:[{r,c}], sunk:false}]
    let playerBoard = createEmptyBoard();
    let aiBoard = createEmptyBoard();
    let playerShips = []; // after game starts
    let aiShips = [];
    let gameOver = false;
    let playerTurn = true;

    // AI state
    let aiHitQueue = []; // cells to target next (hunt-and-target)
    let aiAttacked = new Set(); // 'r,c' strings

    // ----- DOM refs -----
    const messageBar = document.getElementById('message-bar');
    const placementPhase = document.getElementById('placement-phase');
    const gamePhase = document.getElementById('game-phase');
    const gameOverOverlay = document.getElementById('game-over');
    const gameOverMessage = document.getElementById('game-over-message');
    const placementGrid = document.getElementById('placement-grid');
    const playerGrid = document.getElementById('player-grid');
    const enemyGrid = document.getElementById('enemy-grid');
    const rotateBtn = document.getElementById('rotate-btn');
    const randomBtn = document.getElementById('random-btn');
    const resetBtn = document.getElementById('reset-btn');
    const startBtn = document.getElementById('start-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const shipOptions = document.querySelectorAll('.ship-option');
    const playerFleet = document.getElementById('player-fleet');
    const enemyFleet = document.getElementById('enemy-fleet');

    // ----- Helpers -----
    function createEmptyBoard() {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY));
    }

    function setMessage(msg) {
        messageBar.textContent = msg;
    }

    // Build a grid DOM with headers (A-J columns, 1-10 rows)
    function buildGrid(container) {
        container.innerHTML = '';
        // Corner
        const corner = document.createElement('div');
        corner.classList.add('header-cell');
        container.appendChild(corner);
        // Column headers
        for (let c = 0; c < GRID_SIZE; c++) {
            const hdr = document.createElement('div');
            hdr.classList.add('header-cell');
            hdr.textContent = COL_LABELS[c];
            container.appendChild(hdr);
        }
        // Rows
        for (let r = 0; r < GRID_SIZE; r++) {
            // Row header
            const rowHdr = document.createElement('div');
            rowHdr.classList.add('header-cell');
            rowHdr.textContent = r + 1;
            container.appendChild(rowHdr);
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                container.appendChild(cell);
            }
        }
    }

    function getCell(container, r, c) {
        return container.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    }

    // ----- Placement Logic -----
    function getShipCells(r, c, size, orientation) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            const nr = orientation === 'vertical' ? r + i : r;
            const nc = orientation === 'horizontal' ? c + i : c;
            cells.push({ r: nr, c: nc });
        }
        return cells;
    }

    function isValidPlacement(cells, board) {
        for (const { r, c } of cells) {
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (board[r][c] !== EMPTY) return false;
        }
        return true;
    }

    function selectShipOption(index) {
        if (index < 0 || index >= SHIPS.length) return;
        // Check if already placed
        const ship = SHIPS[index];
        const alreadyPlaced = placedShips.some(s => s.name === ship.name);
        if (alreadyPlaced) return;
        currentShipIndex = index;
        shipOptions.forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });
    }

    function updatePlacementUI() {
        // Update ship options
        shipOptions.forEach((opt, i) => {
            const ship = SHIPS[i];
            const placed = placedShips.some(s => s.name === ship.name);
            opt.classList.toggle('placed', placed);
            if (placed) {
                opt.classList.remove('selected');
            }
        });
        // Update board visuals
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = getCell(placementGrid, r, c);
                cell.className = 'cell';
                if (playerBoard[r][c] === SHIP) {
                    cell.classList.add('ship');
                }
            }
        }
        // Enable start if all ships placed
        startBtn.disabled = placedShips.length < SHIPS.length;

        // Auto-select next unplaced ship
        if (placedShips.length < SHIPS.length) {
            const nextIndex = SHIPS.findIndex((s, i) => !placedShips.some(p => p.name === s.name));
            if (nextIndex !== -1) {
                selectShipOption(nextIndex);
            }
        }
    }

    function placeShipOnBoard(r, c) {
        const ship = SHIPS[currentShipIndex];
        if (placedShips.some(s => s.name === ship.name)) return;

        const cells = getShipCells(r, c, ship.size, placementOrientation);
        if (!isValidPlacement(cells, playerBoard)) return;

        cells.forEach(({ r: cr, c: cc }) => {
            playerBoard[cr][cc] = SHIP;
        });
        placedShips.push({ name: ship.name, size: ship.size, cells: cells, sunk: false });
        updatePlacementUI();

        if (placedShips.length === SHIPS.length) {
            setMessage('All ships placed! Click "Start Game" to begin.');
        } else {
            setMessage(`Place your ${SHIPS.find((s, i) => !placedShips.some(p => p.name === s.name)).name}.`);
        }
    }

    function showPlacementPreview(r, c) {
        // Clear previous preview
        clearPlacementPreview();
        const ship = SHIPS[currentShipIndex];
        if (placedShips.some(s => s.name === ship.name)) return;

        const cells = getShipCells(r, c, ship.size, placementOrientation);
        const valid = isValidPlacement(cells, playerBoard);

        cells.forEach(({ r: cr, c: cc }) => {
            if (cr >= 0 && cr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
                const cell = getCell(placementGrid, cr, cc);
                cell.classList.add(valid ? 'ship-preview' : 'ship-preview-invalid');
            }
        });
    }

    function clearPlacementPreview() {
        placementGrid.querySelectorAll('.ship-preview, .ship-preview-invalid').forEach(cell => {
            cell.classList.remove('ship-preview', 'ship-preview-invalid');
        });
    }

    // Random placement helper — retries entire layout if any ship can't be placed
    function randomPlaceShips(board) {
        let ships;
        let success = false;
        let globalAttempts = 0;
        while (!success && globalAttempts < 100) {
            globalAttempts++;
            // Reset board
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    board[r][c] = EMPTY;
                }
            }
            ships = [];
            let allPlaced = true;
            for (const ship of SHIPS) {
                let placed = false;
                let attempts = 0;
                while (!placed && attempts < 200) {
                    attempts++;
                    const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                    const r = Math.floor(Math.random() * GRID_SIZE);
                    const c = Math.floor(Math.random() * GRID_SIZE);
                    const cells = getShipCells(r, c, ship.size, orientation);
                    if (isValidPlacement(cells, board)) {
                        cells.forEach(({ r: cr, c: cc }) => {
                            board[cr][cc] = SHIP;
                        });
                        ships.push({ name: ship.name, size: ship.size, cells: cells, sunk: false });
                        placed = true;
                    }
                }
                if (!placed) {
                    allPlaced = false;
                    break;
                }
            }
            if (allPlaced) {
                success = true;
            }
        }
        return ships;
    }

    // ----- Game Logic -----
    function startGame() {
        // Copy player ships
        playerShips = placedShips.map(s => ({ ...s, cells: s.cells.map(c => ({ ...c })), sunk: false }));

        // Place AI ships
        aiBoard = createEmptyBoard();
        aiShips = randomPlaceShips(aiBoard);

        // Reset AI state
        aiHitQueue = [];
        aiAttacked = new Set();
        gameOver = false;
        playerTurn = true;

        // Switch UI
        placementPhase.classList.add('hidden');
        gamePhase.classList.remove('hidden');

        // Build game grids
        buildGrid(playerGrid);
        buildGrid(enemyGrid);

        // Render player ships on player grid
        renderPlayerBoard();

        // Build fleet status
        renderFleetStatus();

        // Attach enemy grid click
        enemyGrid.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', handlePlayerAttack);
        });

        setMessage('Your turn! Click on the enemy grid to attack.');
    }

    function renderPlayerBoard() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = getCell(playerGrid, r, c);
                cell.className = 'cell';
                const state = playerBoard[r][c];
                if (state === SHIP) cell.classList.add('ship');
                else if (state === HIT) cell.classList.add('hit');
                else if (state === MISS) cell.classList.add('miss');
                else if (state === SUNK) cell.classList.add('sunk');
            }
        }
    }

    function renderEnemyBoard() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = getCell(enemyGrid, r, c);
                cell.className = 'cell';
                // Only show hits, misses, and sunk — not ship positions
                const state = aiBoard[r][c];
                if (state === HIT) cell.classList.add('hit');
                else if (state === MISS) cell.classList.add('miss');
                else if (state === SUNK) cell.classList.add('sunk');
            }
        }
    }

    function renderFleetStatus() {
        playerFleet.innerHTML = '';
        enemyFleet.innerHTML = '';
        playerShips.forEach(ship => {
            const div = document.createElement('div');
            div.classList.add('ship-status-item');
            if (ship.sunk) div.classList.add('sunk-status');
            div.textContent = `${ship.name} (${ship.size})`;
            playerFleet.appendChild(div);
        });
        aiShips.forEach(ship => {
            const div = document.createElement('div');
            div.classList.add('ship-status-item');
            if (ship.sunk) div.classList.add('sunk-status');
            div.textContent = `${ship.name} (${ship.size})`;
            enemyFleet.appendChild(div);
        });
    }

    function handlePlayerAttack(e) {
        if (gameOver || !playerTurn) return;
        const r = parseInt(e.target.dataset.row);
        const c = parseInt(e.target.dataset.col);
        if (isNaN(r) || isNaN(c)) return;

        // Prevent duplicate attacks
        if (aiBoard[r][c] === HIT || aiBoard[r][c] === MISS || aiBoard[r][c] === SUNK) return;

        // Process attack
        if (aiBoard[r][c] === SHIP) {
            aiBoard[r][c] = HIT;
            // Check if ship sunk
            const sunkShip = checkSunk(r, c, aiBoard, aiShips);
            if (sunkShip) {
                setMessage(`You sunk the enemy's ${sunkShip.name}!`);
            } else {
                setMessage('Hit!');
            }
        } else {
            aiBoard[r][c] = MISS;
            setMessage('Miss!');
        }

        renderEnemyBoard();
        renderFleetStatus();

        // Check win
        if (aiShips.every(s => s.sunk)) {
            endGame(true);
            return;
        }

        // AI turn
        playerTurn = false;
        setTimeout(aiTurn, 600);
    }

    function checkSunk(r, c, board, ships) {
        for (const ship of ships) {
            if (ship.sunk) continue;
            const isPartOfShip = ship.cells.some(cell => cell.r === r && cell.c === c);
            if (!isPartOfShip) continue;
            const allHit = ship.cells.every(cell => board[cell.r][cell.c] === HIT);
            if (allHit) {
                ship.sunk = true;
                // Mark cells as sunk
                ship.cells.forEach(cell => {
                    board[cell.r][cell.c] = SUNK;
                });
                return ship;
            }
        }
        return null;
    }

    // ----- AI Logic (Hunt and Target) -----
    function aiTurn() {
        if (gameOver) return;

        let r, c;

        // Target mode: try cells from hit queue
        while (aiHitQueue.length > 0) {
            const target = aiHitQueue.shift();
            r = target.r;
            c = target.c;
            if (!aiAttacked.has(`${r},${c}`) && r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                // Valid target
                aiAttacked.add(`${r},${c}`);
                processAiAttack(r, c);
                return;
            }
        }

        // Hunt mode: random cell
        let attempts = 0;
        do {
            r = Math.floor(Math.random() * GRID_SIZE);
            c = Math.floor(Math.random() * GRID_SIZE);
            attempts++;
        } while (aiAttacked.has(`${r},${c}`) && attempts < 200);

        if (attempts >= 200) {
            // Fallback: find any unattacked cell
            let found = false;
            for (let rr = 0; rr < GRID_SIZE && !found; rr++) {
                for (let cc = 0; cc < GRID_SIZE && !found; cc++) {
                    if (!aiAttacked.has(`${rr},${cc}`)) {
                        r = rr;
                        c = cc;
                        found = true;
                    }
                }
            }
        }

        aiAttacked.add(`${r},${c}`);
        processAiAttack(r, c);
    }

    function processAiAttack(r, c) {
        if (playerBoard[r][c] === SHIP) {
            playerBoard[r][c] = HIT;
            // Add adjacent cells to hit queue
            const adj = [
                { r: r - 1, c: c },
                { r: r + 1, c: c },
                { r: r, c: c - 1 },
                { r: r, c: c + 1 },
            ];
            adj.forEach(a => {
                if (a.r >= 0 && a.r < GRID_SIZE && a.c >= 0 && a.c < GRID_SIZE && !aiAttacked.has(`${a.r},${a.c}`)) {
                    aiHitQueue.push(a);
                }
            });

            const sunkShip = checkSunk(r, c, playerBoard, playerShips);
            if (sunkShip) {
                // Remove from hitQueue any cells that are no longer useful
                // (cells adjacent to the sunk ship that haven't been attacked)
                pruneHitQueue();
                setMessage(`The enemy sunk your ${sunkShip.name}!`);
            } else {
                setMessage('The enemy hit your ship!');
            }
        } else {
            playerBoard[r][c] = MISS;
            setMessage('The enemy missed!');
        }

        renderPlayerBoard();
        renderFleetStatus();

        // Check loss
        if (playerShips.every(s => s.sunk)) {
            endGame(false);
            return;
        }

        playerTurn = true;
    }

    function pruneHitQueue() {
        // Remove targets that are adjacent only to fully-sunk ships
        // Keep targets adjacent to unsunk hits
        const unsunkHits = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (playerBoard[r][c] === HIT) {
                    unsunkHits.add(`${r},${c}`);
                }
            }
        }

        if (unsunkHits.size === 0) {
            aiHitQueue = [];
            return;
        }

        // Keep only targets adjacent to unsunk hits
        aiHitQueue = aiHitQueue.filter(({ r, c }) => {
            if (aiAttacked.has(`${r},${c}`)) return false;
            const adj = [
                { r: r - 1, c: c },
                { r: r + 1, c: c },
                { r: r, c: c - 1 },
                { r: r, c: c + 1 },
            ];
            return adj.some(a => unsunkHits.has(`${a.r},${a.c}`));
        });
    }

    function endGame(playerWon) {
        gameOver = true;
        gameOverMessage.textContent = playerWon
            ? 'Victory! You sunk all enemy ships!'
            : 'Defeat! All your ships have been sunk!';
        gameOverOverlay.classList.remove('hidden');
    }

    function resetAll() {
        playerBoard = createEmptyBoard();
        aiBoard = createEmptyBoard();
        placedShips = [];
        playerShips = [];
        aiShips = [];
        aiHitQueue = [];
        aiAttacked = new Set();
        gameOver = false;
        playerTurn = true;
        currentShipIndex = 0;
        placementOrientation = 'horizontal';

        placementPhase.classList.remove('hidden');
        gamePhase.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');

        rotateBtn.textContent = 'Rotate (Horizontal)';
        updatePlacementUI();
        buildGrid(placementGrid);
        attachPlacementListeners();
        selectShipOption(0);
        setMessage('Place your ships to begin!');
    }

    // ----- Event Handlers -----
    function attachPlacementListeners() {
        placementGrid.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', function () {
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                placeShipOnBoard(r, c);
            });
            cell.addEventListener('mouseenter', function () {
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                showPlacementPreview(r, c);
            });
            cell.addEventListener('mouseleave', function () {
                clearPlacementPreview();
            });
        });
    }

    rotateBtn.addEventListener('click', function () {
        placementOrientation = placementOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        rotateBtn.textContent = `Rotate (${placementOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'})`;
    });

    randomBtn.addEventListener('click', function () {
        playerBoard = createEmptyBoard();
        placedShips = [];
        placedShips = randomPlaceShips(playerBoard).map(s => ({
            ...s,
            cells: s.cells.map(c => ({ ...c })),
        }));
        updatePlacementUI();
        setMessage('Ships randomly placed! Click "Start Game" to begin.');
    });

    resetBtn.addEventListener('click', function () {
        playerBoard = createEmptyBoard();
        placedShips = [];
        currentShipIndex = 0;
        buildGrid(placementGrid);
        attachPlacementListeners();
        updatePlacementUI();
        selectShipOption(0);
        setMessage('Place your ships to begin!');
    });

    startBtn.addEventListener('click', startGame);

    playAgainBtn.addEventListener('click', resetAll);

    shipOptions.forEach((opt, i) => {
        opt.addEventListener('click', function () {
            selectShipOption(i);
        });
    });

    // ----- Init -----
    buildGrid(placementGrid);
    attachPlacementListeners();
    selectShipOption(0);
})();
