// ============================================================
// Battleship Game — Pure HTML/CSS/JS with Visual Polish & Audio
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
    let placementOrientation = 'horizontal';
    let currentShipIndex = 0;
    let placedShips = [];
    let playerBoard = createEmptyBoard();
    let aiBoard = createEmptyBoard();
    let playerShips = [];
    let aiShips = [];
    let gameOver = false;
    let playerTurn = true;

    // AI state
    let aiHitQueue = [];
    let aiAttacked = new Set();
    let aiHuntPool = [];

    // Drag-and-drop state
    let draggedShipName = null;

    // ----- DOM refs -----
    const titleScreen = document.getElementById('title-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const audioControls = document.getElementById('audio-controls');
    const gameWrapper = document.getElementById('game-wrapper');
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
    const playerFleet = document.getElementById('player-fleet');
    const enemyFleet = document.getElementById('enemy-fleet');
    const draggableShips = document.querySelectorAll('.draggable-ship');

    // Audio controls
    const muteToggle = document.getElementById('mute-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const musicVolumeSlider = document.getElementById('music-volume');
    const sfxVolumeSlider = document.getElementById('sfx-volume');

    // ----- Helpers -----
    function createEmptyBoard() {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY));
    }

    function setMessage(msg) {
        messageBar.textContent = msg;
    }

    function buildGrid(container) {
        container.innerHTML = '';
        const corner = document.createElement('div');
        corner.classList.add('header-cell');
        container.appendChild(corner);
        for (let c = 0; c < GRID_SIZE; c++) {
            const hdr = document.createElement('div');
            hdr.classList.add('header-cell');
            hdr.textContent = COL_LABELS[c];
            container.appendChild(hdr);
        }
        for (let r = 0; r < GRID_SIZE; r++) {
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
        const ship = SHIPS[index];
        const alreadyPlaced = placedShips.some(s => s.name === ship.name);
        if (alreadyPlaced) return;
        currentShipIndex = index;
    }

    function updatePlacementUI() {
        // Update draggable ship visuals
        draggableShips.forEach(el => {
            const shipName = el.dataset.ship;
            const placed = placedShips.some(s => s.name.toLowerCase() === shipName);
            el.classList.toggle('placed', placed);
            el.draggable = !placed;
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

        startBtn.disabled = placedShips.length < SHIPS.length;

        if (placedShips.length < SHIPS.length) {
            const nextIndex = SHIPS.findIndex((s) => !placedShips.some(p => p.name === s.name));
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
            const nextShip = SHIPS.find((s) => !placedShips.some(p => p.name === s.name));
            setMessage(`Place your ${nextShip.name}.`);
        }
    }

    function placeShipByName(shipName, r, c) {
        const shipIndex = SHIPS.findIndex(s => s.name.toLowerCase() === shipName);
        if (shipIndex === -1) return false;
        const ship = SHIPS[shipIndex];
        if (placedShips.some(s => s.name === ship.name)) return false;

        const cells = getShipCells(r, c, ship.size, placementOrientation);
        if (!isValidPlacement(cells, playerBoard)) return false;

        cells.forEach(({ r: cr, c: cc }) => {
            playerBoard[cr][cc] = SHIP;
        });
        placedShips.push({ name: ship.name, size: ship.size, cells: cells, sunk: false });
        updatePlacementUI();

        if (placedShips.length === SHIPS.length) {
            setMessage('All ships placed! Click "Start Game" to begin.');
        } else {
            const nextShip = SHIPS.find((s) => !placedShips.some(p => p.name === s.name));
            if (nextShip) setMessage(`Place your ${nextShip.name}.`);
        }
        return true;
    }

    function showPlacementPreview(r, c) {
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

    function showDragPreview(shipName, r, c) {
        clearPlacementPreview();
        const shipIndex = SHIPS.findIndex(s => s.name.toLowerCase() === shipName);
        if (shipIndex === -1) return;
        const ship = SHIPS[shipIndex];

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

    function randomPlaceShips(board) {
        let ships;
        let success = false;
        let globalAttempts = 0;
        while (!success && globalAttempts < 100) {
            globalAttempts++;
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

    // ----- Animation Helpers -----
    function spawnExplosionParticles(cell) {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.classList.add('explosion-particle');
            const angle = (i / 8) * Math.PI * 2;
            const dist = 10 + Math.random() * 10;
            particle.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            particle.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            const colors = ['#ff6f00', '#ff3d00', '#ffab00', '#ff8f00'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            cell.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    function spawnSplashRings(cell) {
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.classList.add('splash-ring');
            ring.style.animationDelay = (i * 0.1) + 's';
            cell.appendChild(ring);
            setTimeout(() => ring.remove(), 600);
        }
    }

    // ----- Game Logic -----
    function startGame() {
        playerShips = placedShips.map(s => ({ ...s, cells: s.cells.map(c => ({ ...c })), sunk: false }));

        aiBoard = createEmptyBoard();
        aiShips = randomPlaceShips(aiBoard);

        aiHitQueue = [];
        aiAttacked = new Set();
        aiHuntPool = buildShuffledPool();
        gameOver = false;
        playerTurn = true;

        placementPhase.classList.add('hidden');
        gamePhase.classList.remove('hidden');

        buildGrid(playerGrid);
        buildGrid(enemyGrid);

        renderPlayerBoard();
        renderFleetStatus();

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

        if (aiBoard[r][c] === HIT || aiBoard[r][c] === MISS || aiBoard[r][c] === SUNK) return;

        // Play cannon fire sound
        BattleshipAudio.playCannonFire();

        const cell = getCell(enemyGrid, r, c);

        if (aiBoard[r][c] === SHIP) {
            aiBoard[r][c] = HIT;
            const sunkShip = checkSunk(r, c, aiBoard, aiShips);
            if (sunkShip) {
                setMessage(`You sunk the enemy's ${sunkShip.name}!`);
                // Re-render to show sunk state, then animate
                renderEnemyBoard();
                sunkShip.cells.forEach(sc => {
                    const sunkCell = getCell(enemyGrid, sc.r, sc.c);
                    spawnExplosionParticles(sunkCell);
                });
                BattleshipAudio.playSinking();
            } else {
                setMessage('Hit!');
                renderEnemyBoard();
                spawnExplosionParticles(cell);
                setTimeout(() => BattleshipAudio.playExplosion(), 50);
            }
        } else {
            aiBoard[r][c] = MISS;
            setMessage('Miss!');
            renderEnemyBoard();
            spawnSplashRings(cell);
            setTimeout(() => BattleshipAudio.playSplash(), 50);
        }

        renderFleetStatus();

        if (aiShips.every(s => s.sunk)) {
            endGame(true);
            return;
        }

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
                ship.cells.forEach(cell => {
                    board[cell.r][cell.c] = SUNK;
                });
                return ship;
            }
        }
        return null;
    }

    function buildShuffledPool() {
        const pool = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                pool.push({ r, c });
            }
        }
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool;
    }

    // ----- AI Logic (Hunt and Target) -----
    function aiTurn() {
        if (gameOver) return;

        let r, c;

        while (aiHitQueue.length > 0) {
            const target = aiHitQueue.shift();
            r = target.r;
            c = target.c;
            if (!aiAttacked.has(`${r},${c}`) && r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                aiAttacked.add(`${r},${c}`);
                processAiAttack(r, c);
                return;
            }
        }

        while (aiHuntPool.length > 0) {
            const pick = aiHuntPool.pop();
            if (!aiAttacked.has(`${pick.r},${pick.c}`)) {
                r = pick.r;
                c = pick.c;
                aiAttacked.add(`${r},${c}`);
                processAiAttack(r, c);
                return;
            }
        }
    }

    function processAiAttack(r, c) {
        const cell = getCell(playerGrid, r, c);

        if (playerBoard[r][c] === SHIP) {
            playerBoard[r][c] = HIT;
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
            const coord = `${COL_LABELS[c]}${r + 1}`;
            if (sunkShip) {
                pruneHitQueue();
                setMessage(`Enemy attacked ${coord} — sunk your ${sunkShip.name}!`);
                renderPlayerBoard();
                sunkShip.cells.forEach(sc => {
                    const sunkCell = getCell(playerGrid, sc.r, sc.c);
                    spawnExplosionParticles(sunkCell);
                });
                BattleshipAudio.playSinking();
            } else {
                setMessage(`Enemy attacked ${coord} — hit!`);
                renderPlayerBoard();
                spawnExplosionParticles(cell);
                BattleshipAudio.playExplosion();
            }
        } else {
            playerBoard[r][c] = MISS;
            const coord = `${COL_LABELS[c]}${r + 1}`;
            setMessage(`Enemy attacked ${coord} — miss!`);
            renderPlayerBoard();
            spawnSplashRings(cell);
            BattleshipAudio.playSplash();
        }

        renderFleetStatus();

        if (playerShips.every(s => s.sunk)) {
            endGame(false);
            return;
        }

        playerTurn = true;
    }

    function pruneHitQueue() {
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

        gameOverOverlay.classList.remove('hidden', 'victory', 'defeat');
        gameOverOverlay.classList.add(playerWon ? 'victory' : 'defeat');

        if (playerWon) {
            BattleshipAudio.playVictoryFanfare();
        } else {
            BattleshipAudio.playDefeatSting();
        }
    }

    function resetAll() {
        playerBoard = createEmptyBoard();
        aiBoard = createEmptyBoard();
        placedShips = [];
        playerShips = [];
        aiShips = [];
        aiHitQueue = [];
        aiAttacked = new Set();
        aiHuntPool = [];
        gameOver = false;
        playerTurn = true;
        currentShipIndex = 0;
        placementOrientation = 'horizontal';
        draggedShipName = null;

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

    // ----- Drag-and-Drop Placement -----
    function setupDragAndDrop() {
        draggableShips.forEach(shipEl => {
            shipEl.addEventListener('dragstart', function (e) {
                if (this.classList.contains('placed')) {
                    e.preventDefault();
                    return;
                }
                draggedShipName = this.dataset.ship;
                this.classList.add('dragging');
                e.dataTransfer.setData('text/plain', this.dataset.ship);
                e.dataTransfer.effectAllowed = 'move';
            });

            shipEl.addEventListener('dragend', function () {
                this.classList.remove('dragging');
                clearPlacementPreview();
                draggedShipName = null;
            });
        });
    }

    function attachPlacementListeners() {
        const cells = placementGrid.querySelectorAll('.cell');
        cells.forEach(cell => {
            // Click to place (fallback)
            cell.addEventListener('click', function () {
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                placeShipOnBoard(r, c);
            });

            // Hover preview
            cell.addEventListener('mouseenter', function () {
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                if (draggedShipName) {
                    showDragPreview(draggedShipName, r, c);
                } else {
                    showPlacementPreview(r, c);
                }
            });

            cell.addEventListener('mouseleave', function () {
                clearPlacementPreview();
            });

            // Drag-and-drop events
            cell.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                if (draggedShipName) {
                    showDragPreview(draggedShipName, r, c);
                }
            });

            cell.addEventListener('dragleave', function () {
                clearPlacementPreview();
            });

            cell.addEventListener('drop', function (e) {
                e.preventDefault();
                const shipName = e.dataTransfer.getData('text/plain');
                const r = parseInt(this.dataset.row);
                const c = parseInt(this.dataset.col);
                if (shipName) {
                    placeShipByName(shipName, r, c);
                }
                clearPlacementPreview();
                draggedShipName = null;
            });
        });
    }

    // ----- Event Handlers -----

    // Title screen -> placement
    startGameBtn.addEventListener('click', function () {
        BattleshipAudio.init();
        BattleshipAudio.startMusic();
        audioControls.classList.remove('hidden');

        titleScreen.classList.add('fade-out');
        setTimeout(() => {
            titleScreen.style.display = 'none';
            gameWrapper.classList.remove('hidden');
        }, 800);
    });

    // Rotation
    rotateBtn.addEventListener('click', function () {
        placementOrientation = placementOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        rotateBtn.textContent = `Rotate (${placementOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'})`;
    });

    // R key rotation
    document.addEventListener('keydown', function (e) {
        if (e.key === 'r' || e.key === 'R') {
            if (!placementPhase.classList.contains('hidden')) {
                placementOrientation = placementOrientation === 'horizontal' ? 'vertical' : 'horizontal';
                rotateBtn.textContent = `Rotate (${placementOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'})`;
            }
        }
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

    // ----- Audio Controls -----
    muteToggle.addEventListener('click', function () {
        const wasMuted = BattleshipAudio.isMuted();
        BattleshipAudio.setMuted(!wasMuted);
        soundIcon.textContent = wasMuted ? '\u{1F50A}' : '\u{1F507}';
    });

    musicVolumeSlider.addEventListener('input', function () {
        BattleshipAudio.setMusicVolume(this.value / 100);
    });

    sfxVolumeSlider.addEventListener('input', function () {
        BattleshipAudio.setSfxVolume(this.value / 100);
    });

    // ----- Init -----
    buildGrid(placementGrid);
    attachPlacementListeners();
    setupDragAndDrop();
    selectShipOption(0);
})();
