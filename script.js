console.log('Script loaded');

let initialized = false;

// Game constants
const constants = {
    AI_MOVE_DELAY: 1500,
    EXPLOSION_DURATION: 1000,
    NUM_PARTICLES: 30,
    MINIMUM_MOVES_BEFORE_FREE_RESTART: 5,
};

// Game state management
const gameState = {
    bigBoard: Array.from({ length: 3 }, () => Array(3).fill(null)),
    smallBoards: Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => Array(3).fill(null))
        )
    ),
    currentPlayer: "X",
    nextBoard: null,
    playerXScore: 0,
    playerOScore: 0,
    tieScore: 0,
    moveCount: 0,
    isAIGame: false,
    aiDifficulty: "medium",
    gameInProgress: false,
    currentAIDifficulty: "medium",
    model: null, // For the TensorFlow model
    playerXName: "Player X",
    playerOName: "Player O",
    lastMove: null,
    winningLine: null,
    aiMoveInProgress: false,
};

// DOM references
const DOMElements = {
    gameBoard: document.getElementById("game-board"),
    playerIndicator: document.getElementById("player-indicator"),
    helpButton: document.getElementById("help-button"),
    helpText: document.getElementById("help-text"),
    overlay: document.getElementById("overlay"),
    nameInputButton: document.getElementById("name-input-button"),
    nameInputText: document.getElementById("name-input-text"),
    saveNamesButton: document.getElementById("save-names-button"),
    playerXNameModal: document.getElementById("player-x-name-modal"),
    playerONameModal: document.getElementById("player-o-name-modal"),
    playerXScoreElement: document.getElementById("player-x-score"),
    playerOScoreElement: document.getElementById("player-o-score"),
    startGameButton: document.getElementById("start-game-button"),
    aiToggle: document.getElementById("ai-toggle"),
    aiDifficultySelect: document.getElementById("ai-difficulty"),
    firstPlayerRadios: document.getElementsByName("first-player"),
    sidebar: document.getElementById("sidebar"),
    toggleSidebarButton: document.getElementById("toggle-sidebar"),
    soundToggle: document.getElementById("sound-toggle"),
    confettiContainer: document.getElementById("confetti-container"),
    statsModal: document.getElementById("stats-modal"),
    showStatsButton: document.getElementById("show-stats-button"),
    closeStatsButton: document.getElementById("close-stats-button"),
    closeHelpButton: document.getElementById("close-help-button"),
};

// UI Manager for handling UI interactions
const UIManager = {
    toggleModal: (modalElement, overlay, display) => {
        modalElement.style.display = display ? "block" : "none";
        overlay.style.display = display ? "block" : "none";
    },
    updateScoreboard: () => {
        DOMElements.playerXScoreElement.textContent = `${gameState.playerXName}: ${gameState.playerXScore}`;
        DOMElements.playerOScoreElement.textContent = `${gameState.playerOName}: ${gameState.playerOScore}`;
        document.getElementById("tie-score").textContent = `Ties: ${gameState.tieScore}`;
    },
    updatePlayerIndicator: () => {
        const playerX = document.getElementById('player-x');
        const playerO = document.getElementById('player-o');
        if (playerX && playerO) {
            playerX.classList.toggle('active', gameState.currentPlayer === 'X');
            playerO.classList.toggle('active', gameState.currentPlayer === 'O');
        }
    },
    highlightActiveBoard: () => {
        document.querySelectorAll(".small-board").forEach(board => {
            board.classList.remove("active-board");
        });
        if (gameState.nextBoard) {
            const [bigRow, bigCol] = gameState.nextBoard;
            const activeBoard = document.querySelector(`.small-board[data-big-row='${bigRow}'][data-big-col='${bigCol}']`);
            if (activeBoard && !activeBoard.classList.contains("taken")) {
                activeBoard.classList.add("active-board");
            } else {
                gameState.nextBoard = null;
                document.querySelectorAll(".small-board:not(.taken)").forEach(board => {
                    board.classList.add("active-board");
                });
            }
        } else {
            document.querySelectorAll(".small-board:not(.taken)").forEach(board => {
                board.classList.add("active-board");
            });
        }
    },
    showConfetti: () => {
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDelay = `${Math.random() * 5}s`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            DOMElements.confettiContainer.appendChild(confetti);
        }
        setTimeout(() => {
            DOMElements.confettiContainer.innerHTML = '';
        }, 5000);
    },
    handleBoardCompletion: (bigRow, bigCol, winner) => {
        gameState.bigBoard[bigRow][bigCol] = winner;
        const smallBoardElement = document.querySelector(`.small-board[data-big-row='${bigRow}'][data-big-col='${bigCol}']`);
        smallBoardElement.classList.add("taken");
        smallBoardElement.dataset.winner = winner;

        // Remove last-move class from all cells in this small board
        smallBoardElement.querySelectorAll('.cell').forEach(cell => cell.classList.remove('last-move'));

        // Add visual effect for completed board if desired
        UIManager.createExplosionEffect(smallBoardElement);

        // Keep the last move visible
        const lastMoveCell = smallBoardElement.querySelector('.cell.last-move');
        if (lastMoveCell) {
            lastMoveCell.style.display = 'flex';
            lastMoveCell.style.zIndex = '11';
        }
    },
    createExplosionEffect: (parentElement) => {
        const numParticles = constants.NUM_PARTICLES;
        const explosionDuration = constants.EXPLOSION_DURATION;

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            const size = Math.random() * 8 + 4;
            const angle = Math.random() * 360;
            const distance = Math.random() * 100 + 50;
            const duration = Math.random() * 0.5 + 0.5;

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = `hsl(${Math.random() * 60 + 10}, 100%, 50%)`;
            particle.style.borderRadius = '50%';
            particle.style.position = 'absolute';
            particle.style.top = '50%';
            particle.style.left = '50%';
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.opacity = '1';

            particle.animate([
                { transform: 'translate(-50%, -50%)', opacity: 1 },
                {
                    transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), 
                               calc(-50% + ${Math.sin(angle) * distance}px))`,
                    opacity: 0
                }
            ], {
                duration: explosionDuration * duration,
                easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                fill: 'forwards'
            });

            parentElement.appendChild(particle);
            setTimeout(() => particle.remove(), explosionDuration);
        }
    },
    shakeCells: (parentElement) => {
        parentElement.querySelectorAll('.cell').forEach(cell => {
            cell.classList.add('shake');
            setTimeout(() => cell.classList.remove('shake'), 1500);
        });
    },
    initializeSidebar() {
        const sidebar = DOMElements.sidebar;
        const toggleButton = DOMElements.toggleSidebarButton;
        
        // Show sidebar on initial load for desktop
        if (window.innerWidth > 768) {
            sidebar.classList.add("visible");
            toggleButton.textContent = "Hide Sidebar";
        } else {
            sidebar.classList.remove("visible");
            toggleButton.textContent = "Show Sidebar";
        }
    },
    
    updateSidebarOnGameStart() {
        const sidebar = DOMElements.sidebar;
        if (window.innerWidth <= 10000000000) {
            sidebar.classList.remove("visible");
            DOMElements.toggleSidebarButton.textContent = "Show Sidebar";
        }
    }
};

// Initialize the game board
function initializeGameBoard() {
    console.log("Initializing game board...");
    const gameBoard = DOMElements.gameBoard;

    // Debug check
    if (!gameBoard) {
        console.error('Game board element not found!');
        return;
    }

    gameBoard.innerHTML = '';

    // Add pointer-events CSS to ensure clicks reach the cells
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .big-board {
            pointer-events: auto;
        }
        .small-board {
            pointer-events: auto;
        }
        .cell {
            pointer-events: auto;
            cursor: pointer;
            min-width: 30px;
            min-height: 30px;
            border: 1px solid #ccc;
            position: relative;
            z-index: 1;
        }
    `;
    document.head.appendChild(styleElement);

    // Create the 3x3 grid of small boards
    for (let bigRow = 0; bigRow < 3; bigRow++) {
        for (let bigCol = 0; bigCol < 3; bigCol++) {
            const smallBoard = document.createElement('div');
            smallBoard.className = 'small-board';
            smallBoard.dataset.bigRow = bigRow;
            smallBoard.dataset.bigCol = bigCol;

            // Create the 3x3 grid of cells within each small board
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    cell.dataset.bigRow = bigRow;
                    cell.dataset.bigCol = bigCol;

                    cell.onclick = function (e) {
                        console.log('Cell clicked at:', {
                            bigRow, bigCol, row, col,
                            gameState: {
                                inProgress: gameState.gameInProgress,
                                currentPlayer: gameState.currentPlayer,
                                nextBoard: gameState.nextBoard
                            }
                        });

                        // Visual feedback
                        this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        setTimeout(() => {
                            this.style.backgroundColor = '';
                        }, 200);

                        if (!gameState.gameInProgress) {
                            console.log('Game not in progress');
                            return;
                        }

                        // Check if it's a valid move
                        const validMove = isValidMove(parseInt(bigRow), parseInt(bigCol), parseInt(row), parseInt(col));
                        console.log('Is valid move?', validMove);

                        if (validMove) {
                            console.log('Making move...');
                            const moveResult = makeMove(parseInt(bigRow), parseInt(bigCol), parseInt(row), parseInt(col));
                            console.log('Move result:', moveResult);

                            // If AI mode is on and it's AI's turn, make AI move
                            if (moveResult && gameState.isAIGame && gameState.currentPlayer === 'O') {
                                setTimeout(makeAIMove, 500);
                            }
                        } else {
                            console.log('Invalid move:', {
                                nextBoard: gameState.nextBoard,
                                currentCell: gameState.smallBoards[bigRow][bigCol][row][col]
                            });
                        }
                    };

                    smallBoard.appendChild(cell);
                }
            }

            gameBoard.appendChild(smallBoard);
        }
    }

    // Add a test click handler to the game board itself
    gameBoard.onclick = function (e) {
        console.log('Game board clicked:', e.target);
    };

    console.log('Board initialized with click handlers');
}

// Check if a move is valid
function isValidMove(bigRow, bigCol, row, col) {
    // First check if the big board position is already won
    if (gameState.bigBoard[bigRow][bigCol] !== null) {
        return false;
    }

    // Check if the cell is empty
    if (gameState.smallBoards[bigRow][bigCol][row][col] !== null) {
        return false;
    }

    // If there's a next board specified
    if (gameState.nextBoard) {
        const [nextBigRow, nextBigCol] = gameState.nextBoard;
        // If the next board is not won and we're trying to play elsewhere
        if (gameState.bigBoard[nextBigRow][nextBigCol] === null &&
            (bigRow !== nextBigRow || bigCol !== nextBigCol)) {
            return false;
        }
    }

    return true;
}

// Start a new game
function startNewGame(isNewStart = false) {
    clearBoard();
    gameState.gameInProgress = true;
    gameState.moveCount = 0;
    gameState.nextBoard = null;

    UIManager.updateSidebarOnGameStart();

    const aiFirst = document.getElementById('ai-first');
    if (isNewStart && aiFirst && aiFirst.checked && gameState.isAIGame) {
        gameState.currentPlayer = 'O';
        updateUI();
        if (!gameState.aiMoveInProgress) {
            makeAIMove();
        }
    } else {
        gameState.currentPlayer = 'X';
        updateUI();
    }
}

// Clear the game board
function clearBoard() {
    // Reset game state
    gameState.smallBoards = Array(3).fill(null).map(() =>
        Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() =>
                Array(3).fill(null)
            )
        )
    );
    gameState.bigBoard = Array(3).fill(null).map(() => Array(3).fill(null));
    gameState.nextBoard = null;
    gameState.currentPlayer = 'X';
    gameState.gameInProgress = false;

    // Clear UI
    clearBoardUI();
}

// Clear the UI elements of the board
function clearBoardUI() {
    // Clear all cell contents and classes
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
        cell.style.backgroundColor = '';
    });

    // Clear board classes
    document.querySelectorAll('.small-board').forEach(board => {
        board.className = 'small-board';
        board.removeAttribute('data-winner');
    });

    // Clear any highlights
    document.querySelectorAll('.active-board').forEach(board => {
        board.classList.remove('active-board');
    });

    // Clear any last-move highlights
    document.querySelectorAll('.last-move').forEach(cell => {
        cell.classList.remove('last-move');
    });

    // Clear any confetti
    if (DOMElements.confettiContainer) {
        DOMElements.confettiContainer.innerHTML = '';
    }

    // Reset player indicators
    const playerX = document.getElementById('player-x');
    const playerO = document.getElementById('player-o');
    if (playerX) playerX.classList.add('active');
    if (playerO) playerO.classList.remove('active');
}

// Update the UI after each move or state change
function updateUI() {
    console.log('Updating UI, current player:', gameState.currentPlayer);

    // Update player turn indicator
    UIManager.updatePlayerIndicator();

    // Update board highlighting based on next valid move
    UIManager.highlightActiveBoard();
}

// Add this to the start game button click handler
DOMElements.startGameButton.addEventListener('click', () => {
    // Check if there's a game in progress
    if (gameState.gameInProgress && gameState.moveCount > 0) {
        const startNew = confirm('A game is in progress. Start a new game?');
        if (!startNew) {
            console.log('New game cancelled, maintaining current game state');
            return;  // Exit immediately
        }
    }

    // Only proceed if user confirmed or no game in progress
    startNewGame(true);  // Pass flag to indicate it's a fresh start
    UIManager.updateSidebarOnGameStart(); // Add this line to auto-hide sidebar on game start
});

// Make a move on the board
function makeMove(bigRow, bigCol, row, col) {
    try {
        // Make the move on the board
        gameState.smallBoards[bigRow][bigCol][row][col] = gameState.currentPlayer;
        gameState.moveCount++;

        // Update the cell in the UI
        updateCell(bigRow, bigCol, row, col);

        // Play move sound
        AudioManager.playSound('move');

        // Check if this move won the small board
        if (checkWin(gameState.smallBoards[bigRow][bigCol])) {
            UIManager.handleBoardCompletion(bigRow, bigCol, gameState.currentPlayer);

            // Check if winning the small board resulted in winning the big board
            if (checkWin(gameState.bigBoard)) {
                handleGameEnd(gameState.currentPlayer);
                return true;
            }
        } else if (isBoardFull(gameState.smallBoards[bigRow][bigCol])) {
            UIManager.handleBoardCompletion(bigRow, bigCol, 'T');
        }

        // Set the next board based on the current move
        gameState.nextBoard = gameState.bigBoard[row][col] !== null ? null : [row, col];
        gameState.lastMove = [bigRow, bigCol, row, col];

        // Switch players
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

        // Update the UI
        updateUI();
        return true;
    } catch (error) {
        console.error('Error in makeMove:', error);
        return false;
    }
}

// Check if there's a winner on the board
function checkWin(board) {
    // Check rows
    for (let i = 0; i < 3; i++) {
        if (board[i][0] && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
            gameState.winningLine = [[i, 0], [i, 1], [i, 2]];
            return board[i][0];
        }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
        if (board[0][j] && board[0][j] === board[1][j] && board[0][j] === board[2][j]) {
            gameState.winningLine = [[0, j], [1, j], [2, j]];
            return board[0][j];
        }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
        gameState.winningLine = [[0, 0], [1, 1], [2, 2]];
        return board[0][0];
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
        gameState.winningLine = [[0, 2], [1, 1], [2, 0]];
        return board[0][2];
    }

    return null;
}

// Update a cell after a move is made
function updateCell(bigRow, bigCol, row, col) {
    const cell = document.querySelector(`.small-board[data-big-row="${bigRow}"][data-big-col="${bigCol}"] .cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.textContent = gameState.currentPlayer;
        cell.classList.add("taken");
    }
}

// Reset the game
function resetGame() {
    gameState.bigBoard = Array.from({ length: 3 }, () => Array(3).fill(null));
    gameState.smallBoards = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => Array(3).fill(null))
        )
    );
    gameState.moveCount = 0;
    gameState.nextBoard = null;
    gameState.gameInProgress = false;
    DOMElements.gameBoard.innerHTML = "";
    initializeGameBoard();
}

// Add event listeners to initialize the game
function initializeEventListeners() {
    console.log("Initializing event listeners...");

    // Update help modal handlers
    DOMElements.helpButton.addEventListener("click", () => {
        UIManager.toggleModal(DOMElements.helpText, DOMElements.overlay, true);
    });

    DOMElements.closeHelpButton.addEventListener("click", () => {
        UIManager.toggleModal(DOMElements.helpText, DOMElements.overlay, false);
    });

    DOMElements.helpButton.addEventListener("click", () => UIManager.toggleModal(DOMElements.helpText, DOMElements.overlay, true));
    DOMElements.overlay.addEventListener("click", () => UIManager.toggleModal(DOMElements.helpText, DOMElements.overlay, false));
    DOMElements.toggleSidebarButton.addEventListener("click", toggleSidebar);

    // AI toggle handler
    DOMElements.aiToggle.addEventListener('change', handleAIToggle);

    // Difficulty change handler
    DOMElements.aiDifficultySelect.addEventListener('change', handleDifficultyChange);

    // Stats button handlers
    DOMElements.showStatsButton.addEventListener('click', () => {
        StatsManager.displayStats();
        UIManager.toggleModal(DOMElements.statsModal, DOMElements.overlay, true);
    });

    DOMElements.closeStatsButton.addEventListener('click', () => {
        UIManager.toggleModal(DOMElements.statsModal, DOMElements.overlay, false);
    });
}

// Toggle the sidebar visibility
function toggleSidebar() {
    DOMElements.sidebar.classList.toggle("visible");
    DOMElements.toggleSidebarButton.textContent = DOMElements.sidebar.classList.contains("visible") ? "Hide Sidebar" : "Show Sidebar";
}

// AI functions
async function makeAIMove() {
    if (!gameState.gameInProgress || gameState.currentPlayer !== 'O' || gameState.aiMoveInProgress) {
        return;
    }

    gameState.aiMoveInProgress = true;
    console.log('AI starting to think...');

    try {
        // Enforce minimum thinking time
        const MINIMUM_THINK_TIME = 1500; // 1.5 seconds
        const thinkingStart = Date.now();
        
        // Find the best move
        let move;
        switch (gameState.aiDifficulty) {
            case 'impossible':
                move = await findBestMove(1.0);
                break;
            case 'hard':
                move = await findBestMove(0.85);
                break;
            case 'medium':
                move = await findBestMove(0.5);
                break;
            case 'easy':
            default:
                move = findRandomMove();
                break;
        }

        // Calculate remaining time to meet minimum think time
        const elapsedTime = Date.now() - thinkingStart;
        const remainingDelay = Math.max(0, MINIMUM_THINK_TIME - elapsedTime);
        
        // Wait for the remaining time if needed
        if (remainingDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingDelay));
        }

        if (move && isValidMove(...move)) {
            console.log('Making AI move:', move);
            makeMove(...move);
        } else {
            console.error('AI could not find a valid move');
        }
    } catch (error) {
        console.error('Error in AI move:', error);
    } finally {
        gameState.aiMoveInProgress = false;
    }
}

// AI Helper Functions
async function predictMove() {
    try {
        if (!gameState.model) {
            const modelUrl = 'https://alysoun.github.io/Super-Tic-Tac-Toe/tfjs_model2/model.json';
            gameState.model = await tf.loadGraphModel(modelUrl);
        }

        const input = prepareInputForModel();
        const prediction = await gameState.model.predict(tf.tensor2d([input], [1, 81])).data();
        
        // Get all valid moves
        const validMoves = getAllValidMoves();
        
        // Rank moves by their predicted probability
        const rankedMoves = validMoves.map(move => {
            const [bigRow, bigCol, row, col] = move;
            const index = bigRow * 27 + bigCol * 9 + row * 3 + col;
            return { move, probability: prediction[index] };
        }).sort((a, b) => b.probability - a.probability);

        return rankedMoves[0]?.move;
    } catch (error) {
        console.error('Error in predictMove:', error);
        return null;
    }
}

function findBestMove(probability = 1.0) {
    // Use probability to sometimes choose random move instead of best move
    if (Math.random() > probability) {
        return findRandomMove();
    }

    // Check for immediate winning moves
    const winningMove = findWinningMove('O');
    if (winningMove) return winningMove;

    // Check for blocking opponent's winning moves
    const blockingMove = findWinningMove('X');
    if (blockingMove) return blockingMove;

    // If no immediate winning/blocking moves, use minimax
    return findStrategicMove();
}

function findRandomMove() {
    const validMoves = getAllValidMoves();
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}

function getAllValidMoves() {
    const moves = [];
    const [nextBigRow, nextBigCol] = gameState.nextBoard || [null, null];

    // If we're restricted to a specific board
    if (nextBigRow !== null && nextBigCol !== null) {
        if (gameState.bigBoard[nextBigRow][nextBigCol] === null) {
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    if (gameState.smallBoards[nextBigRow][nextBigCol][row][col] === null) {
                        moves.push([nextBigRow, nextBigCol, row, col]);
                    }
                }
            }
        }
    }

    // If no valid moves in target board (or no target board), check all boards
    if (moves.length === 0) {
        for (let bigRow = 0; bigRow < 3; bigRow++) {
            for (let bigCol = 0; bigCol < 3; bigCol++) {
                if (gameState.bigBoard[bigRow][bigCol] === null) {
                    for (let row = 0; row < 3; row++) {
                        for (let col = 0; col < 3; col++) {
                            if (gameState.smallBoards[bigRow][bigCol][row][col] === null) {
                                moves.push([bigRow, bigCol, row, col]);
                            }
                        }
                    }
                }
            }
        }
    }

    return moves;
}

function findWinningMove(player) {
    const validMoves = getAllValidMoves();
    
    for (const move of validMoves) {
        const [bigRow, bigCol, row, col] = move;
        
        // Try the move
        gameState.smallBoards[bigRow][bigCol][row][col] = player;
        
        // Check if it wins the small board
        if (checkWin(gameState.smallBoards[bigRow][bigCol])) {
            // Check if winning the small board wins the game
            gameState.bigBoard[bigRow][bigCol] = player;
            const isGameWinning = checkWin(gameState.bigBoard);
            
            // Undo the moves
            gameState.bigBoard[bigRow][bigCol] = null;
            gameState.smallBoards[bigRow][bigCol][row][col] = null;
            
            if (isGameWinning) return move;
        } else {
            // Undo the move
            gameState.smallBoards[bigRow][bigCol][row][col] = null;
        }
    }
    
    return null;
}

function findStrategicMove() {
    const validMoves = getAllValidMoves();
    let bestScore = -Infinity;
    let bestMove = null;

    for (const move of validMoves) {
        const [bigRow, bigCol, row, col] = move;
        const score = evaluateMove(bigRow, bigCol, row, col);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function evaluateMove(bigRow, bigCol, row, col) {
    let score = 0;
    
    // Early game strategy (first 3 moves)
    if (gameState.moveCount < 3) {
        // Massive bonus for center of center board
        if (bigRow === 1 && bigCol === 1 && row === 1 && col === 1) {
            return 100000; // Should always take this if available
        }
    }
    
    // Immediate wins (highest priority)
    if (wouldWinSmallBoard(bigRow, bigCol, row, col, 'O')) {
        score += 10000;
        if (wouldWinBigBoard(bigRow, bigCol, 'O')) {
            return Infinity;
        }
    }
    
    // Center board control (second highest priority)
    if (bigRow === 1 && bigCol === 1) {
        score += 5000;
        if (row === 1 && col === 1) {
            score += 3000;
        }
    }
    
    // Blocking opponent wins
    if (wouldWinSmallBoard(bigRow, bigCol, row, col, 'X')) {
        score += 8000;
        if (wouldWinBigBoard(bigRow, bigCol, 'X')) {
            score += 9000;
        }
    }
    
    // Strategic control
    score += evaluateStrategicControl(bigRow, bigCol, row, col);
    
    return score;
}

function evaluateStrategicControl(bigRow, bigCol, row, col) {
    let score = 0;
    
    // Center control
    if (row === 1 && col === 1) score += 1000;
    
    // Corner control with additional context
    if ((row === 0 || row === 2) && (col === 0 || col === 2)) {
        score += 500;
        // Extra points if we already have the center
        if (gameState.smallBoards[bigRow][bigCol][1][1] === 'O') {
            score += 300;
        }
    }
    
    // Evaluate forcing moves
    const nextBoardWon = gameState.bigBoard[row][col] !== null;
    if (!nextBoardWon) {
        // Bonus for sending opponent to a board we control
        if (hasControllingPosition(row, col)) {
            score += 700;
        }
        // Penalty for sending to a board where opponent has advantage
        if (opponentHasAdvantage(row, col)) {
            score -= 500;
        }
    }
    
    return score;
}

function hasControllingPosition(bigRow, bigCol) {
    // Check if we have a strong position in the target board
    const board = gameState.smallBoards[bigRow][bigCol];
    let ourCount = 0;
    let centerControl = board[1][1] === 'O';
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === 'O') ourCount++;
        }
    }
    
    return centerControl || ourCount >= 2;
}

function opponentHasAdvantage(bigRow, bigCol) {
    const board = gameState.smallBoards[bigRow][bigCol];
    let opponentCount = 0;
    let centerControl = board[1][1] === 'X';
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === 'X') opponentCount++;
        }
    }
    
    return centerControl || opponentCount >= 2;
}

// Add this helper function to check if a move creates a fork
function countWinningThreats(board, player) {
    let threats = 0;
    const lines = [
        // Rows
        [[0,0], [0,1], [0,2]],
        [[1,0], [1,1], [1,2]],
        [[2,0], [2,1], [2,2]],
        // Columns
        [[0,0], [1,0], [2,0]],
        [[0,1], [1,1], [2,1]],
        [[0,2], [1,2], [2,2]],
        // Diagonals
        [[0,0], [1,1], [2,2]],
        [[0,2], [1,1], [2,0]]
    ];
    
    for (const line of lines) {
        const values = line.map(([r, c]) => board[r][c]);
        const playerCount = values.filter(v => v === player).length;
        const emptyCount = values.filter(v => v === null).length;
        if (playerCount === 2 && emptyCount === 1) threats++;
    }
    
    return threats;
}

function countEmptyCells(board) {
    return board.flat().filter(cell => cell === null).length;
}

function wouldWinSmallBoard(bigRow, bigCol, row, col, player) {
    const tempBoard = gameState.smallBoards[bigRow][bigCol].map(row => [...row]);
    tempBoard[row][col] = player;
    return checkWin(tempBoard) === player;
}

function wouldWinBigBoard(bigRow, bigCol, player) {
    const tempBoard = gameState.bigBoard.map(row => [...row]);
    tempBoard[bigRow][bigCol] = player;
    return checkWin(tempBoard) === player;
}

function prepareInputForModel() {
    const input = new Array(81).fill(0);
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const bigBoardValue = gameState.bigBoard[i][j];
            if (bigBoardValue === 'X') {
                input[i * 27 + j * 9] = 1;
            } else if (bigBoardValue === 'O') {
                input[i * 27 + j * 9] = -1;
            } else {
                for (let k = 0; k < 3; k++) {
                    for (let l = 0; l < 3; l++) {
                        const value = gameState.smallBoards[i][j][k][l];
                        const index = i * 27 + j * 9 + k * 3 + l;
                        if (value === 'X') input[index] = 1;
                        else if (value === 'O') input[index] = -1;
                    }
                }
            }
        }
    }
    
    return input;
}

// Stats Manager
const StatsManager = {
    updateStats(result) {
        const stats = JSON.parse(localStorage.getItem('superTicTacToeStats')) || {
            easy: { wins: 0, losses: 0, ties: 0 },
            medium: { wins: 0, losses: 0, ties: 0 },
            hard: { wins: 0, losses: 0, ties: 0 },
            impossible: { wins: 0, losses: 0, ties: 0 }
        };

        stats[gameState.aiDifficulty][result]++;
        localStorage.setItem('superTicTacToeStats', JSON.stringify(stats));
    },

    displayStats() {
        const stats = JSON.parse(localStorage.getItem('superTicTacToeStats')) || {
            easy: { wins: 0, losses: 0, ties: 0 },
            medium: { wins: 0, losses: 0, ties: 0 },
            hard: { wins: 0, losses: 0, ties: 0 },
            impossible: { wins: 0, losses: 0, ties: 0 }
        };

        // Update stats display
        Object.entries(stats).forEach(([difficulty, results]) => {
            const winsElement = document.getElementById(`${difficulty}-wins`);
            const lossesElement = document.getElementById(`${difficulty}-losses`);
            const tiesElement = document.getElementById(`${difficulty}-ties`);
            
            if (winsElement) winsElement.textContent = results.wins;
            if (lossesElement) lossesElement.textContent = results.losses;
            if (tiesElement) tiesElement.textContent = results.ties;
        });

        // Update tie score display
        const tieScoreElement = document.getElementById("tie-score");
        if (tieScoreElement) {
            tieScoreElement.textContent = `Ties: ${gameState.tieScore}`;
        }
    }
};

// Audio Manager
const AudioManager = {
    audioContext: null,
    isMuted: false,

    initialize() {
        try {
            // Create new audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized:', this.audioContext.state);

            // Resume audio context (needed for some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed');
                });
            }

            // Load mute preference
            this.isMuted = localStorage.getItem('soundMuted') === 'true';
            this.updateSoundToggle();

            console.log('AudioManager initialized successfully');
        } catch (e) {
            console.error('Failed to initialize AudioManager:', e);
        }
    },

    playSound(type) {
        if (this.isMuted || !this.audioContext) return;

        try {
            const gainNode = this.audioContext.createGain();
            gainNode.connect(this.audioContext.destination);

            // Resume context if needed
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            oscillator.connect(gainNode);

            switch (type) {
                case 'move':
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.1);
                    break;

                case 'invalidMove':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.1);
                    break;

                case 'boardWin':
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                    break;
            }
        } catch (e) {
            console.error('Error playing sound:', e);
        }
    },

    toggleSound() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('soundMuted', this.isMuted);
        this.updateSoundToggle();
        console.log('Sound toggled:', this.isMuted ? 'muted' : 'unmuted');
    },

    updateSoundToggle() {
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.textContent = this.isMuted ? '🔇 Sound Off' : '🔊 Sound On';
        }
    },

    playVictorySound() {
        // Implementation of victory sound
    },

    playDefeatSound() {
        // Implementation of defeat sound
    },

    playTieSound() {
        // Implementation of tie sound
    }
};

// Handle AI toggle change
function handleAIToggle() {
    console.log('AI Toggle changed');
    gameState.isAIGame = DOMElements.aiToggle.checked;
    const aiFirst = document.getElementById('ai-first');
    
    if (aiFirst) {
        aiFirst.disabled = !gameState.isAIGame;
        // If AI toggle is turned on and AI is set to go first, start new game
        if (gameState.isAIGame && aiFirst.checked) {
            startNewGame(true);
        }
    }
    
    updatePlayerNames();
}

// Handle difficulty change
function handleDifficultyChange() {
    const newDifficulty = DOMElements.aiDifficultySelect.value;

    if (gameState.gameInProgress) {
        if (gameState.moveCount < constants.MINIMUM_MOVES_BEFORE_FREE_RESTART) {
            const message = `Changing difficulty before ${constants.MINIMUM_MOVES_BEFORE_FREE_RESTART} moves will count as a loss. Continue?`;
            if (confirm(message)) {
                if (gameState.isAIGame) {
                    StatsManager.updateStats('losses');
                    alert("Game counted as a loss due to early difficulty change.");
                }
                gameState.aiDifficulty = newDifficulty;
                startNewGame();
            } else {
                DOMElements.aiDifficultySelect.value = gameState.aiDifficulty;
            }
        } else {
            if (confirm("Changing difficulty will start a new game. Continue?")) {
                gameState.aiDifficulty = newDifficulty;
                startNewGame();
            } else {
                DOMElements.aiDifficultySelect.value = gameState.aiDifficulty;
            }
        }
    } else {
        gameState.aiDifficulty = newDifficulty;
    }
}

// Initialize the game
function initializeGame() {
    initializeGameBoard();
    initializeEventListeners();
    
    // Set initial AI state
    gameState.isAIGame = DOMElements.aiToggle.checked;
    const aiFirst = document.getElementById('ai-first');
    if (aiFirst) {
        aiFirst.disabled = !gameState.isAIGame;
    }
    
    updateUI();
    updatePlayerNames();
}

// Update player names based on game mode
function updatePlayerNames() {
    gameState.playerXName = "Player X";
    gameState.playerOName = gameState.isAIGame ? "AI" : "Player O";
    UIManager.updateScoreboard();
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    initializeGame();
    UIManager.initializeSidebar();
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        UIManager.initializeSidebar();
    });

    // Set up UI elements only
    DOMElements.soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
    const aiFirst = document.getElementById('ai-first');
    aiFirst.disabled = !gameState.isAIGame;
    AudioManager.initialize();
    StatsManager.displayStats();
});

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
}

function handleGameEnd(winner) {
    gameState.gameInProgress = false;
    
    // Update scores
    if (winner === 'X') {
        gameState.playerXScore++;
        if (gameState.isAIGame) {
            StatsManager.updateStats('wins');
        }
    } else if (winner === 'O') {
        gameState.playerOScore++;
        if (gameState.isAIGame) {
            StatsManager.updateStats('losses');
        }
    } else if (winner === 'T') {
        gameState.tieScore++;
        if (gameState.isAIGame) {
            StatsManager.updateStats('ties');
        }
    }

    // Update UI
    UIManager.updateScoreboard();
    
    // Play appropriate sound
    if (winner === 'X') {
        AudioManager.playVictorySound();
    } else if (winner === 'O') {
        AudioManager.playDefeatSound();
    } else {
        AudioManager.playTieSound();
    }

    // Show victory effects
    if (winner !== 'T') {
        UIManager.showConfetti();
        const winnerName = winner === 'X' ? gameState.playerXName : gameState.playerOName;
        setTimeout(() => alert(`${winnerName} wins!`), 100);
    } else {
        setTimeout(() => alert("It's a tie!"), 100);
    }

    // Open sidebar to show final score
    DOMElements.sidebar.classList.add("visible");
    DOMElements.toggleSidebarButton.textContent = "Hide Sidebar";
}

