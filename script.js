document.addEventListener("DOMContentLoaded", () => {
    // DOM element references
    const gameBoard = document.getElementById("game-board");
    const playerIndicator = document.getElementById("player-indicator");
    const helpButton = document.getElementById("help-button");
    const helpText = document.getElementById("help-text");
    const closeHelpButton = document.getElementById("close-help-button");
    const overlay = document.getElementById("overlay");
    const nameInputButton = document.getElementById("name-input-button");
    const nameInputText = document.getElementById("name-input-text");
    const saveNamesButton = document.getElementById("save-names-button");
    const playerXNameModal = document.getElementById("player-x-name-modal");
    const playerONameModal = document.getElementById("player-o-name-modal");
    const playerXScoreElement = document.getElementById("player-x-score");
    const playerOScoreElement = document.getElementById("player-o-score");
    const startGameButton = document.getElementById("start-game-button");
    const aiToggle = document.getElementById("ai-toggle");
    const aiDifficultySelect = document.getElementById("ai-difficulty");
    const firstPlayerRadios = document.getElementsByName("first-player");
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarButton = document.getElementById("toggle-sidebar");
    const soundToggle = document.getElementById("sound-toggle");
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Game state variables
    let playerXScore = 0;
    let playerOScore = 0;
    let playerXName = "Player X";
    let playerOName = "Player O";

    // Initialize game boards
    const bigBoard = Array.from({ length: 3 }, () => Array(3).fill(null));
    const smallBoards = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Array(3).fill(null))));
    let currentPlayer = "X";
    let nextBoard = null;

    // Event listeners for UI elements
    helpButton.addEventListener("click", () => {
        // Show help text and overlay
        helpText.style.display = "block";
        overlay.style.display = "block";
    });

    closeHelpButton.addEventListener("click", () => {
        // Hide help text and overlay
        helpText.style.display = "none";
        overlay.style.display = "none";
    });

    overlay.addEventListener("click", () => {
        // Hide help text and name input text, and overlay
        helpText.style.display = "none";
        nameInputText.style.display = "none";
        overlay.style.display = "none";
    });

    nameInputButton.addEventListener("click", () => {
        // Show name input text and overlay
        nameInputText.style.display = "block";
        overlay.style.display = "block";
    });

    saveNamesButton.addEventListener("click", () => {
        // Save player names and update scoreboard
        playerXName = playerXNameModal.value || "Player X";
        playerOName = playerONameModal.value || "Player O";
        playerXScoreElement.textContent = `${playerXName}: ${playerXScore}`;
        playerOScoreElement.textContent = `${playerOName}: ${playerOScore}`;
        nameInputText.style.display = "none";
        overlay.style.display = "none";
    });

    function createBoardElement() {
        // Create and return a small board element
        const boardElement = document.createElement("div");
        boardElement.classList.add("small-board");
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = i;
                cell.dataset.col = j;
                boardElement.appendChild(cell);
            }
        }
        return boardElement;
    }

    function initializeGameBoard() {
        // Create the initial game board structure
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const boardElement = createBoardElement();
                boardElement.dataset.bigRow = i;
                boardElement.dataset.bigCol = j;
                gameBoard.appendChild(boardElement);
            }
        }
    }

    function checkWin(board) {
        // Check if there's a winner on the given board
        const winningCombinations = [
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]],
        ];
        for (const combination of winningCombinations) {
            const [a, b, c] = combination;
            if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
                return board[a[0]][a[1]];
            }
        }
        return null;
    }

    function isBoardFull(board) {
        // Check if the given board is full
        return board.flat().every(cell => cell !== null);
    }

    function createExplosionEffect(parentElement) {
        const numParticles = 30; // Number of particles in the explosion
        const explosionDuration = 1000; // Duration of the explosion animation in milliseconds

        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Randomize particle properties
            const size = Math.random() * 8 + 4; // Random size between 4px and 12px
            const angle = Math.random() * 360; // Random angle for particle direction
            const distance = Math.random() * 100 + 50; // Random distance from center
            const duration = Math.random() * 0.5 + 0.5; // Random duration between 0.5s and 1s
            
            // Set particle styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = `hsl(${Math.random() * 60 + 10}, 100%, 50%)`; // Random color in yellow-orange range
            particle.style.borderRadius = '50%';
            particle.style.position = 'absolute';
            particle.style.top = '50%';
            particle.style.left = '50%';
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.opacity = '1';

            // Animate the particle
            particle.animate([
                { transform: 'translate(-50%, -50%)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`, opacity: 0 }
            ], {
                duration: explosionDuration * duration,
                easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                fill: 'forwards'
            });

            parentElement.appendChild(particle);

            // Remove particle after animation
            setTimeout(() => {
                particle.remove();
            }, explosionDuration);
        }
    }

    function shakeCells(parentElement) {
        // Add shake animation to cells
        parentElement.querySelectorAll('.cell').forEach(cell => {
            cell.classList.add('shake');
            setTimeout(() => {
                cell.classList.remove('shake');
            }, 1500);
        });
    }

    function handleBoardCompletion(bigRow, bigCol, winner) {
        // Handle the completion of a small board
        bigBoard[bigRow][bigCol] = winner;
        const smallBoardElement = document.querySelector(`.small-board[data-big-row='${bigRow}'][data-big-col='${bigCol}']`);
        shakeCells(smallBoardElement);
        setTimeout(() => {
            smallBoardElement.classList.add("taken");
            smallBoardElement.dataset.winner = winner;
            createExplosionEffect(smallBoardElement);
        }, 500);
    }

    function playSound(type) {
        if (!soundToggle.checked) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'move':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'win':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
                setTimeout(() => {
                    const osc2 = audioContext.createOscillator();
                    osc2.type = 'square';
                    osc2.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
                    osc2.connect(gainNode);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    osc2.start();
                    osc2.stop(audioContext.currentTime + 0.3);
                }, 100);
                break;
            case 'draw':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime); // F4 note
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
                setTimeout(() => {
                    const osc2 = audioContext.createOscillator();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(293.66, audioContext.currentTime); // D4 note
                    osc2.connect(gainNode);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                    osc2.start();
                    osc2.stop(audioContext.currentTime + 0.2);
                }, 200);
                break;
        }
    }

    // Add these new functions at the top of your file
    let model; // Declare this at the top of your file

    async function loadModel() {
        if (!model) {
            const modelUrl = 'https://alysoun.github.io/Super-Tic-Tac-Toe/tfjs_model2/model.json';
            model = await tf.loadGraphModel(modelUrl);
        }
        return model;
    }

    async function getAIMove() {
        const model = await loadModel();
        
        // // // console.log("Current game state:", smallBoards);

        let validBoardRow, validBoardCol;
        if (nextBoard) {
            [validBoardRow, validBoardCol] = nextBoard;
        } else {
            validBoardRow = validBoardCol = null;
        }
        // // console.log(`Valid board: [${validBoardRow}, ${validBoardCol}]`);

        const validMoves = getAvailableMoves(validBoardRow, validBoardCol);
        // // console.log("Valid moves:", validMoves);

        // Check for immediate winning moves for AI
        for (const move of validMoves) {
            const [bigRow, bigCol, row, col] = move;
            if (wouldWinSmallBoard(smallBoards[bigRow][bigCol], row, col, 'O')) {
                if (wouldWinBigBoard(bigBoard, bigRow, bigCol, 'O')) {
                    // // console.log("Found game-winning move:", move);
                    return move;
                }
                // // console.log("Found board-winning move:", move);
                return move;
            }
        }

        // Check for blocking opponent's winning moves
        for (const move of validMoves) {
            const [bigRow, bigCol, row, col] = move;
            if (wouldWinSmallBoard(smallBoards[bigRow][bigCol], row, col, 'X')) {
                if (wouldWinBigBoard(bigBoard, bigRow, bigCol, 'X')) {
                    // // console.log("Found game-saving move:", move);
                    return move;
                }
                // // console.log("Found board-saving move:", move);
                return move;
            }
        }

        // Use the model for other moves
        const input = prepareInputForModel(smallBoards, bigBoard);
        const inputTensor = tf.tensor2d([input], [1, 81]);

        const prediction = model.predict(inputTensor);
        // // console.log("Raw model prediction:", await prediction.data());

        const moveProbs = await prediction.data();

        const rankedMoves = validMoves.map(move => {
            const [bigRow, bigCol, row, col] = move;
            const index = bigRow * 27 + bigCol * 9 + row * 3 + col;
            return { move, prob: moveProbs[index] };
        }).sort((a, b) => b.prob - a.prob);

        // // console.log("Ranked valid moves:", rankedMoves);

        // Choose the move with the highest probability among valid moves
        const bestMove = rankedMoves[0].move;

        // // console.log("Selected move:", bestMove);
        return bestMove;
    }

    function wouldWinBigBoard(bigBoard, row, col, player) {
        const tempBoard = bigBoard.map(row => [...row]);
        tempBoard[row][col] = player;
        return checkWin(tempBoard) === player;
    }

    function prepareInputForModel(smallBoards, bigBoard) {
        const input = new Array(81).fill(0);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const bigBoardValue = bigBoard[i][j];
                if (bigBoardValue === 'X') {
                    input[i * 27 + j * 9] = 1;
                } else if (bigBoardValue === 'O') {
                    input[i * 27 + j * 9] = -1;
                } else {
                    for (let k = 0; k < 3; k++) {
                        for (let l = 0; l < 3; l++) {
                            const cellValue = smallBoards[i][j][k][l];
                            if (cellValue === 'X') {
                                input[i * 27 + j * 9 + k * 3 + l] = 1;
                            } else if (cellValue === 'O') {
                                input[i * 27 + j * 9 + k * 3 + l] = -1;
                            }
                        }
                    }
                }
            }
        }
        return input;
    }

    // Add this constant at the top of your file
    const AI_MOVE_DELAY = 1500; // 1.5 seconds delay

    // Modify the makeAIMove function
    async function makeAIMove() {
        // // console.log("AI move started");
        if (currentPlayer !== "O") {
            // // console.log("Not AI's turn, aborting AI move");
            return;
        }
        gameBoard.classList.add("ai-thinking");
        
        await new Promise(resolve => setTimeout(resolve, AI_MOVE_DELAY));
        
        let validBoardRow, validBoardCol;
        if (nextBoard) {
            [validBoardRow, validBoardCol] = nextBoard;
        } else {
            validBoardRow = validBoardCol = null;
        }
        // // console.log(`Valid board: [${validBoardRow}, ${validBoardCol}]`);

        let bestMove;

        if (aiDifficulty === 'impossible') {
            const aiMove = await getAIMove();
            // // console.log("AI move from TensorFlow model:", aiMove);
            if (aiMove && aiMove.length === 4) {
                const [bigRow, bigCol, row, col] = aiMove;
                if (validBoardRow === null || validBoardCol === null || (bigRow === validBoardRow && bigCol === validBoardCol)) {
                    bestMove = aiMove;
                } else {
                    bestMove = makeRandomMove(validBoardRow, validBoardCol);
                }
            } else {
                console.error("Invalid move from TensorFlow model");
                bestMove = makeRandomMove(validBoardRow, validBoardCol);
            }
        } else {
            // Use the existing AI logic for other difficulties
            const timeLimit = 5000;
            const startTime = Date.now();

            switch (aiDifficulty) {
                case 'easy':
                    bestMove = makeRandomMove(validBoardRow, validBoardCol);
                    break;
                case 'medium':
                    bestMove = Math.random() < 0.5 ? makeRandomMove(validBoardRow, validBoardCol) : makeBestMove(3, timeLimit, startTime, validBoardRow, validBoardCol);
                    break;
                case 'hard':
                    bestMove = Math.random() < 0.85 ? makeBestMove(5, timeLimit, startTime, validBoardRow, validBoardCol) : makeRandomMove(validBoardRow, validBoardCol);
                    break;
            }
        }

         console.log(`AI decided on move: ${JSON.stringify(bestMove)}`);
        if (bestMove && bestMove.length === 4) {
            const [bigRow, bigCol, row, col] = bestMove;
            if (bigBoard[bigRow][bigCol] !== null) {
                console.error("AI attempted to play in an already won board:", bestMove);
                bestMove = makeRandomMove(null, null);
                if (!bestMove) {
                    console.error("No valid moves available");
                    gameBoard.classList.remove("ai-thinking");
                    return;
                }
            }
            const cell = document.querySelector(`.small-board[data-big-row="${bigRow}"][data-big-col="${bigCol}"] .cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                // // console.log("Executing AI move");
                cell.textContent = currentPlayer;
                smallBoards[bigRow][bigCol][row][col] = currentPlayer;
                cell.classList.add("taken");

                // Check for a win or draw in the small board
                const smallBoardWinner = checkWin(smallBoards[bigRow][bigCol]);
                if (smallBoardWinner) {
                    handleBoardCompletion(bigRow, bigCol, smallBoardWinner);
                    nextBoard = null;
                } else if (isBoardFull(smallBoards[bigRow][bigCol])) {
                    const xCount = smallBoards[bigRow][bigCol].flat().filter(cell => cell === "X").length;
                    const oCount = smallBoards[bigRow][bigCol].flat().filter(cell => cell === "O").length;
                    const winner = xCount > oCount ? "X" : oCount > xCount ? "O" : "T";
                    handleBoardCompletion(bigRow, bigCol, winner);
                    nextBoard = null;
                }

                // Determine the next board to play
                if (bigBoard[row][col] !== null) {
                    nextBoard = null;
                } else {
                    nextBoard = [row, col];
                }

                // Update UI and switch players
                highlightActiveBoard();
                currentPlayer = currentPlayer === "X" ? "O" : "X";
                updatePlayerIndicator();
                playSound('move');

                // // console.log("AI move executed");
            } else {
                console.error("AI tried to make an invalid move:", bestMove);
            }
        } else {
            console.error("AI failed to find a valid move");
            gameBoard.classList.remove("ai-thinking");
            return;
        }

        gameBoard.classList.remove("ai-thinking");
        // // console.log("AI move completed");
    }

    function makeRandomMove(validBoardRow, validBoardCol) {
        const availableMoves = getAvailableMoves(validBoardRow, validBoardCol);
        if (availableMoves.length > 0) {
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        }
        return null;
    }

    function getAvailableMoves(validBoardRow, validBoardCol) {
        const moves = [];
        if (validBoardRow !== null && validBoardCol !== null) {
            // Only consider moves in the specified board if it's not already won
            if (bigBoard[validBoardRow][validBoardCol] === null) {
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (smallBoards[validBoardRow][validBoardCol][row][col] === null) {
                            moves.push([validBoardRow, validBoardCol, row, col]);
                        }
                    }
                }
            }
        } else {
            // Consider moves in all non-completed boards
            for (let bigRow = 0; bigRow < 3; bigRow++) {
                for (let bigCol = 0; bigCol < 3; bigCol++) {
                    if (bigBoard[bigRow][bigCol] === null) {
                        for (let row = 0; row < 3; row++) {
                            for (let col = 0; col < 3; col++) {
                                if (smallBoards[bigRow][bigCol][row][col] === null) {
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

    function handleCellClick(event) {
        if (!gameBoard.classList.contains("game-active") || (isAIGame && currentPlayer === "O")) return;
        
        const cell = event.target;
        const bigRow = parseInt(cell.parentElement.dataset.bigRow);
        const bigCol = parseInt(cell.parentElement.dataset.bigCol);
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        console.log(`Player clicked: [${bigRow},${bigCol},${row},${col}]`);

        if (smallBoards[bigRow][bigCol][row][col] !== null) return;
        if (nextBoard !== null && (bigRow !== nextBoard[0] || bigCol !== nextBoard[1])) return;

        // Immediately update the cell and game state
        cell.textContent = currentPlayer;
        smallBoards[bigRow][bigCol][row][col] = currentPlayer;
        cell.classList.add("taken");

        // Check for a win or draw in the small board
        const smallBoardWinner = checkWin(smallBoards[bigRow][bigCol]);
        if (smallBoardWinner) {
            handleBoardCompletion(bigRow, bigCol, smallBoardWinner);
            nextBoard = null;
            
            // Check for a win on the big board
            const bigBoardWinner = checkWin(bigBoard);
            if (bigBoardWinner) {
                handleBigBoardWin(bigBoardWinner);
                return; // End the game
            }
        } else if (isBoardFull(smallBoards[bigRow][bigCol])) {
            handleBoardCompletion(bigRow, bigCol, "T");
            nextBoard = null;
        } else {
            nextBoard = bigBoard[row][col] !== null ? null : [row, col];
        }

        // Update UI
        highlightActiveBoard();
        playSound('move');

        // Switch players
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        updatePlayerIndicator();

        // If it's now AI's turn, trigger AI move after a short delay
        if (isAIGame && currentPlayer === "O") {
            setTimeout(() => {
                makeAIMove();
            }, 100); // Small delay to ensure UI updates are visible
        }
    }

    function updateScoreboard() {
        playerXScoreElement.textContent = `${playerXName}: ${playerXScore}`;
        playerOScoreElement.textContent = `${playerOName}: ${playerOScore}`;
    }

    function handleBigBoardWin(winner) {
        gameBoard.classList.remove("game-active");
        const winnerName = winner === "X" ? playerXName : playerOName;
        alert(`${winnerName} wins the game!`);
        
        if (isAIGame) {
            if (winner === "X") {
                updateStats('wins');
                playerXScore++;
                showConfetti(); // Only show confetti when human player wins against AI
            } else {
                updateStats('losses');
                playerOScore++;
            }
        } else {
            // For non-AI games, update scores for both players and always show confetti
            if (winner === "X") {
                playerXScore++;
            } else {
                playerOScore++;
            }
            showConfetti();
        }
        
        updateScoreboard();
        
        // Open the sidebar
        sidebar.classList.add("visible");
        toggleSidebarButton.textContent = "Hide Sidebar";
        
        // Scroll to the "Start New Game" button
        const startGameButton = document.getElementById("start-game-button");
        if (startGameButton) {
            startGameButton.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function highlightActiveBoard() {
        // Highlight the active board(s) for the next move
        document.querySelectorAll(".small-board").forEach(board => {
            board.classList.remove("active-board");
        });
        if (nextBoard) {
            const [bigRow, bigCol] = nextBoard;
            const activeBoard = document.querySelector(`.small-board[data-big-row='${bigRow}'][data-big-col='${bigCol}']`);
            if (activeBoard && !activeBoard.classList.contains("taken")) {
                activeBoard.classList.add("active-board");
            } else {
                nextBoard = null;
                document.querySelectorAll(".small-board:not(.taken)").forEach(board => {
                    board.classList.add("active-board");
                });
            }
        } else {
            document.querySelectorAll(".small-board:not(.taken)").forEach(board => {
                board.classList.add("active-board");
            });
        }
    }

    function resetGame() {
        gameBoard.classList.remove("game-active");
        gameBoard.innerHTML = "";
        bigBoard.forEach(row => row.fill(null));
        smallBoards.forEach(boardRow => boardRow.forEach(board => board.forEach(row => row.fill(null))));
        nextBoard = null;
        initializeGameBoard();
    }

    // Add click event listener to the game board
    gameBoard.addEventListener("click", handleCellClick);

    // Add these new variables
    let isAIGame = false;
    let aiDifficulty = 'easy';

    function startNewGame() {
        resetGame();
        let startingPlayer = "X";
        const selectedFirstPlayer = document.querySelector('input[name="first-player"]:checked').value;
        
        if (selectedFirstPlayer === "random") {
            startingPlayer = Math.random() < 0.5 ? "X" : "O";
        } else if (selectedFirstPlayer === "ai" && isAIGame) {
            startingPlayer = "O";
        }

        currentPlayer = startingPlayer;
        updatePlayerIndicator();
        gameBoard.classList.add("game-active");
        
        // Hide the sidebar
        sidebar.classList.remove("visible");
        toggleSidebarButton.textContent = "Show Sidebar";
        
        isAIGame = aiToggle.checked;
        
        if (isAIGame && currentPlayer === "O") {
            setTimeout(makeAIMove, 500);
        }
    }

    startGameButton.addEventListener("click", startNewGame);

    function updatePlayerIndicator() {
        const playerX = document.getElementById('player-x');
        const playerO = document.getElementById('player-o');
        
        playerX.classList.toggle('active', currentPlayer === 'X');
        playerO.classList.toggle('active', currentPlayer === 'O');
        
        playerX.querySelector('.player-name').textContent = isAIGame ? 'Player' : 'Player X';
        playerO.querySelector('.player-name').textContent = isAIGame ? 'AI' : 'Player O';
    }

    aiToggle.addEventListener("change", () => {
        isAIGame = aiToggle.checked;
        updateAIControls();
    });

    aiDifficultySelect.addEventListener("change", () => {
        aiDifficulty = aiDifficultySelect.value;
    });

    function updateAIControls() {
        const aiFirstRadio = document.getElementById("ai-first");
        aiFirstRadio.disabled = !isAIGame;
        if (!isAIGame && aiFirstRadio.checked) {
            document.getElementById("player-first").checked = true;
        }
        
        // Clear existing options
        aiDifficultySelect.innerHTML = '';
        
        // Add all options
        const difficulties = ['easy', 'medium', 'hard', 'impossible'];
        difficulties.forEach(difficulty => {
            const option = document.createElement("option");
            option.value = difficulty;
            option.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            aiDifficultySelect.appendChild(option);
        });
    }

    function getDynamicDepth(bigBoard) {
        // Count the number of empty cells to determine game stage
        const emptyCells = bigBoard.flat().filter(cell => cell === null).length;
        
        // Adjust depth based on the game stage
        if (emptyCells > 6) {  // Early game, lots of available moves
            return 3;
        } else if (emptyCells > 3) {  // Mid game
            return 5;
        } else {  // Late game, fewer moves left
            return 7;
        }
    }

    function makeBestMove(maxDepth, remainingTime, startTime, validBoardRow, validBoardCol) {
        // // console.log(`makeBestMove called with max depth ${maxDepth}, remaining time ${remainingTime}ms`);
        const availableMoves = getAvailableMoves(validBoardRow, validBoardCol);
        if (availableMoves.length === 0) {
            console.error("No available moves found");
            return null;
        }

        // Check for immediate winning moves or blocking moves
        for (const move of availableMoves) {
            const [bigRow, bigCol, row, col] = move;
            
            // Check if this move wins a small board
            if (wouldWinSmallBoard(smallBoards[bigRow][bigCol], row, col, "O")) {
                return move;
            }
            
            // Check if this move blocks opponent from winning a small board
            if (wouldWinSmallBoard(smallBoards[bigRow][bigCol], row, col, "X")) {
                return move;
            }
        }

        let bestScore = -Infinity;
        let bestMove = null;

        // Calculate dynamic depth based on the current state of the big board
        const dynamicDepth = getDynamicDepth(bigBoard);
        const effectiveDepth = Math.min(maxDepth, dynamicDepth);

        // // console.log(`Using dynamic depth: ${effectiveDepth}`);

        for (const move of availableMoves) {
            const [bigRow, bigCol, row, col] = move;
            smallBoards[bigRow][bigCol][row][col] = "O";
            updateBigBoard(bigBoard, bigRow, bigCol);
            const score = minimax(smallBoards, bigBoard, effectiveDepth, false, -Infinity, Infinity, [row, col], remainingTime, startTime);
            smallBoards[bigRow][bigCol][row][col] = null;
            updateBigBoard(bigBoard, bigRow, bigCol);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            if (Date.now() - startTime > remainingTime) {
                // // console.log("Time limit reached in makeBestMove");
                break;
            }
        }

        // // console.log(`makeBestMove returning move: ${JSON.stringify(bestMove)}`);
        return bestMove;
    }

    function wouldWinSmallBoard(board, row, col, player) {
        // Create a copy of the board and make the move
        const tempBoard = board.map(row => [...row]);
        tempBoard[row][col] = player;
        return checkWin(tempBoard) === player;
    }

    function minimax(smallBoards, bigBoard, depth, isMaximizing, alpha, beta, lastMove, timeLimit, startTime) {
        if (Date.now() - startTime > timeLimit) {
            return isMaximizing ? -Infinity : Infinity;
        }

        const bigBoardWinner = checkWin(bigBoard);
        if (bigBoardWinner === "O") return 1000 + depth;
        if (bigBoardWinner === "X") return -1000 - depth;
        if (isBoardFull(bigBoard) || depth === 0) return evaluateBoard(bigBoard, smallBoards, isMaximizing ? "O" : "X", lastMove);

        const availableMoves = getAvailableMoves(lastMove[0], lastMove[1]);
        let bestScore = isMaximizing ? -Infinity : Infinity;

        for (const move of availableMoves) {
            const [bigRow, bigCol, row, col] = move;
            smallBoards[bigRow][bigCol][row][col] = isMaximizing ? "O" : "X";
            updateBigBoard(bigBoard, bigRow, bigCol);
            const score = minimax(smallBoards, bigBoard, depth - 1, !isMaximizing, alpha, beta, [row, col], timeLimit, startTime);
            smallBoards[bigRow][bigCol][row][col] = null;
            updateBigBoard(bigBoard, bigRow, bigCol);

            if (isMaximizing) {
                bestScore = Math.max(score, bestScore);
                alpha = Math.max(alpha, bestScore);
            } else {
                bestScore = Math.min(score, bestScore);
                beta = Math.min(beta, bestScore);
            }

            if (beta <= alpha) break;
        }

        return bestScore;
    }

    function evaluateBoard(bigBoard, smallBoards, player, lastMove) {
        let score = 0;
        const opponent = player === "O" ? "X" : "O";

        // Evaluate big board
        score += evaluateLines(bigBoard, player, opponent, 1000);

        // Evaluate small boards
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (bigBoard[i][j] === null) {
                    score += evaluateLines(smallBoards[i][j], player, opponent, 10);
                    score += evaluateCenter(smallBoards[i][j], player);
                    score += evaluateCorners(smallBoards[i][j], player);
                }
            }
        }

        // Evaluate strategic positions on the big board
        score += evaluateCenter(bigBoard, player) * 100;
        score += evaluateCorners(bigBoard, player) * 50;

        return score;
    }

    function evaluateLines(board, player, opponent, weight) {
        let score = 0;
        const lines = [
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]]
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            const cellValues = [board[a[0]][a[1]], board[b[0]][b[1]], board[c[0]][c[1]]];
            const playerCount = cellValues.filter(cell => cell === player).length;
            const opponentCount = cellValues.filter(cell => cell === opponent).length;
            const emptyCount = cellValues.filter(cell => cell === null).length;

            if (playerCount === 3) score += 100 * weight;
            else if (playerCount === 2 && emptyCount === 1) score += 10 * weight;
            else if (playerCount === 1 && emptyCount === 2) score += 1 * weight;
            
            if (opponentCount === 2 && emptyCount === 1) score -= 50 * weight; // Blocking opponent's win
        }

        return score;
    }

    function evaluateCenter(board, player) {
        return board[1][1] === player ? 5 : 0;
    }

    function evaluateCorners(board, player) {
        const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
        return corners.filter(([r, c]) => board[r][c] === player).length * 3;
    }

    function updateBigBoard(bigBoard, bigRow, bigCol) {
        const winner = checkWin(smallBoards[bigRow][bigCol]);
        if (winner) {
            bigBoard[bigRow][bigCol] = winner;
        } else if (isBoardFull(smallBoards[bigRow][bigCol])) {
            bigBoard[bigRow][bigCol] = "T";
        } else {
            bigBoard[bigRow][bigCol] = null;
        }
    }

    function toggleSidebar() {
        sidebar.classList.toggle("visible");
        toggleSidebarButton.textContent = sidebar.classList.contains("visible") ? "Hide Sidebar" : "Show Sidebar";
    }

    toggleSidebarButton.addEventListener("click", toggleSidebar);

    // Function to check window size and update sidebar visibility
    function checkWindowSize() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("visible");
            toggleSidebarButton.textContent = "Show Sidebar";
        } else {
            sidebar.classList.add("visible");
            toggleSidebarButton.textContent = "Hide Sidebar";
        }
    }

    // Check window size on load and resize
    window.addEventListener("load", checkWindowSize);
    window.addEventListener("resize", checkWindowSize);

    // Initially show the sidebar
    sidebar.classList.add("visible");
    toggleSidebarButton.textContent = "Hide Sidebar";

    function showConfetti() {
        const confettiContainer = document.getElementById('confetti-container');
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDelay = `${Math.random() * 5}s`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            confettiContainer.appendChild(confetti);
        }
        setTimeout(() => {
            confettiContainer.innerHTML = '';
        }, 5000);
    }

    // Initialize the game board, but don't start a new game automatically
    initializeGameBoard();
    gameBoard.classList.remove("game-active");
    updateAIControls();

    document.addEventListener("DOMContentLoaded", function() {
        // Set default values
        isAIGame = true;
        aiDifficulty = "medium";

        // Update UI to reflect default values
        document.getElementById("ai-toggle").checked = true;
        document.getElementById("ai-difficulty").value = "medium";

        // Initialize the game with these settings
        initializeGame();
    });

    function initializeGame() {
        // ... existing initialization code ...

        // Update game state based on AI settings
        isAIGame = document.getElementById("ai-toggle").checked;
        aiDifficulty = document.getElementById("ai-difficulty").value;

        // If it's an AI game and AI goes first, trigger AI move
        if (isAIGame && currentPlayer === "O") {
            setTimeout(makeAIMove, 500);
        }

        // ... rest of initialization code ...
    }

    document.getElementById("ai-toggle").addEventListener("change", function() {
        isAIGame = this.checked;
        if (isAIGame && currentPlayer === "O") {
            setTimeout(makeAIMove, 500);
        }
    });

    document.getElementById("ai-difficulty").addEventListener("change", function() {
        aiDifficulty = this.value;
    });

    // Initialize statistics object
    let gameStats = JSON.parse(localStorage.getItem('superTicTacToeStats')) || {
        easy: { wins: 0, losses: 0, ties: 0 },
        medium: { wins: 0, losses: 0, ties: 0 },
        hard: { wins: 0, losses: 0, ties: 0 },
        impossible: { wins: 0, losses: 0, ties: 0 }
    };

    function updateStats(result) {
        if (isAIGame) {
            gameStats[aiDifficulty][result]++;
            localStorage.setItem('superTicTacToeStats', JSON.stringify(gameStats));
        }
    }

    function displayStats() {
        for (const [difficulty, stats] of Object.entries(gameStats)) {
            document.getElementById(`${difficulty}-wins`).textContent = stats.wins;
            document.getElementById(`${difficulty}-losses`).textContent = stats.losses;
            document.getElementById(`${difficulty}-ties`).textContent = stats.ties;
        }
    }

    function resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            gameStats = {
                easy: { wins: 0, losses: 0, ties: 0 },
                medium: { wins: 0, losses: 0, ties: 0 },
                hard: { wins: 0, losses: 0, ties: 0 },
                impossible: { wins: 0, losses: 0, ties: 0 }
            };
            localStorage.setItem('superTicTacToeStats', JSON.stringify(gameStats));
            displayStats();
        }
    }

    // Event listeners
    document.getElementById('show-stats-button').addEventListener('click', function() {
        displayStats();
        document.getElementById('stats-modal').style.display = 'block';
    });

    document.getElementById('close-stats-button').addEventListener('click', function() {
        document.getElementById('stats-modal').style.display = 'none';
    });

    document.getElementById('reset-stats-button').addEventListener('click', resetStats);

    // Close the modal if clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target == document.getElementById('stats-modal')) {
            document.getElementById('stats-modal').style.display = 'none';
        }
    });

    // Add a function to handle ties and update stats
    function handleTie() {
        gameBoard.classList.remove("game-active");
        alert("The game is a tie!");
        if (isAIGame) {
            updateStats('ties');
        }
        updateScoreboard();
        
        // Open the sidebar
        sidebar.classList.add("visible");
        toggleSidebarButton.textContent = "Hide Sidebar";
        
        // Scroll to the "Start New Game" button
        const startGameButton = document.getElementById("start-game-button");
        if (startGameButton) {
            startGameButton.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    // Make sure to call handleTie() when appropriate in your game logic

    // Remove the following functions and button creation code:

    // function triggerWin(player) {
    //     // ... (removed)
    // }

    // // Add a button to the sidebar for triggering wins (for debugging)
    // const triggerWinXButton = document.createElement('button');
    // triggerWinXButton.textContent = 'Trigger Win for X';
    // triggerWinXButton.addEventListener('click', () => triggerWin('X'));

    // const triggerWinOButton = document.createElement('button');
    // triggerWinOButton.textContent = 'Trigger Win for O';
    // triggerWinOButton.addEventListener('click', () => triggerWin('O'));

    // sidebar.appendChild(triggerWinXButton);
    // sidebar.appendChild(triggerWinOButton);

    function checkWinSmallBoard(board) {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        for (const combination of winningCombinations) {
            const [a, b, c] = combination;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    function findImmediateWinOrBlock(board, player) {
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                const testBoard = [...board];
                testBoard[i] = player;
                if (checkWinSmallBoard(testBoard) === player) {
                    return i;
                }
            }
        }
        return null;
    }

    function findImmediateWinOrBlockBigBoard(player) {
        for (let bigRow = 0; bigRow < 3; bigRow++) {
            for (let bigCol = 0; bigCol < 3; bigCol++) {
                if (bigBoard[bigRow][bigCol] === null) {
                    const testBigBoard = bigBoard.map(row => [...row]);
                    testBigBoard[bigRow][bigCol] = player;
                    if (checkWin(testBigBoard) === player) {
                        return { bigRow, bigCol };
                    }
                }
            }
        }
        return null;
    }

    function evaluateStrategicValue(bigRow, bigCol, row, col) {
        let value = 0;
        
        // Prefer center of big board
        if (bigRow === 1 && bigCol === 1) value += 3;
        
        // Prefer corners of big board
        if ((bigRow === 0 || bigRow === 2) && (bigCol === 0 || bigCol === 2)) value += 2;
        
        // Prefer center of small board
        if (row === 1 && col === 1) value += 2;
        
        // Prefer corners of small board
        if ((row === 0 || row === 2) && (col === 0 || col === 2)) value += 1;
        
        return value;
    }

    function findWinningMove(board, player) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === null) {
                    board[i][j] = player;
                    if (checkWin(board) === player) {
                        board[i][j] = null;
                        return [i, j];
                    }
                    board[i][j] = null;
                }
            }
        }
        return null;
    }
});
