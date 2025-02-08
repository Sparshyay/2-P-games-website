// Game initialization status
let gameInitialized = {
    tictactoe: false,
    snake: false,
    pong: false,
    memory: false
};

// Game module functions
const gameModules = {
    tictactoe: {
        init: function() {
            let currentPlayer = 'X';
            let gameState = ['', '', '', '', '', '', '', '', ''];
            let gameActive = true;
            let scores = { X: 0, O: 0 };

            const winningConditions = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
                [0, 4, 8], [2, 4, 6] // Diagonals
            ];

            const board = document.querySelector('.tictactoe-board');
            const scoreX = document.getElementById('score-x');
            const scoreO = document.getElementById('score-o');
            const gameStatus = document.querySelector('.game-status');
            if (!board) return;

            // Create the game board
            board.innerHTML = Array(9).fill('')
                .map((_, i) => `<div class="tictactoe-cell" data-cell-index="${i}"></div>`)
                .join('');

            const cells = document.querySelectorAll('.tictactoe-cell');

            function updateScores() {
                if (scoreX) scoreX.textContent = scores.X;
                if (scoreO) scoreO.textContent = scores.O;
            }

            function updateStatus(message) {
                if (gameStatus) {
                    gameStatus.textContent = message;
                    gameStatus.classList.add('active');
                }
            }

            function handleCellClick(e) {
                const cell = e.target;
                const index = parseInt(cell.getAttribute('data-cell-index'));

                if (gameState[index] !== '' || !gameActive) return;

                gameState[index] = currentPlayer;
                cell.textContent = currentPlayer;

                if (checkWin()) {
                    scores[currentPlayer]++;
                    updateScores();
                    updateStatus(`Player ${currentPlayer} wins!`);
                    gameActive = false;
                    return;
                }

                if (gameState.every(cell => cell !== '')) {
                    updateStatus("Game Draw!");
                    gameActive = false;
                    return;
                }

                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                updateStatus(`Player ${currentPlayer}'s turn`);
            }

            function checkWin() {
                return winningConditions.some(condition => {
                    return condition.every(index => {
                        return gameState[index] === currentPlayer;
                    });
                });
            }

            function resetGame() {
                currentPlayer = 'X';
                gameState = ['', '', '', '', '', '', '', '', ''];
                gameActive = true;
                cells.forEach(cell => cell.textContent = '');
                updateStatus("Player X's turn");
            }

            // Event Listeners
            cells.forEach(cell => {
                cell.addEventListener('click', handleCellClick);
            });

            // Add restart button functionality
            const restartBtn = document.querySelector('#tictactoe .restart-game');
            if (restartBtn) {
                restartBtn.addEventListener('click', resetGame);
            }

            // Initialize scores and status
            updateScores();
            updateStatus("Player X's turn");
        },
    },
    snake: {
        init: function() {
            const canvas = document.getElementById('snake-game');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 600;
            canvas.height = 600;
            
            const tileSize = 30;
            const tileCount = canvas.width / tileSize;
            
            let score = 0;
            let highScore = localStorage.getItem('snakeHighScore') || 0;
            let gameOver = false;
            let gameLoop = null;
            let lastRenderTime = 0;
            let GAME_SPEED = 10;
            
            let snakeSegments = [{ x: 10, y: 10 }];
            let dx = 0;
            let dy = 0;
            let food = null;
            let powerUpActive = false;
            let powerUpTimer = 0;
            let gameStarted = false;
            let lightningEffect = false;
            
            const COLORS = {
                background: '#1a1a1a',
                grid: '#2a2a2a',
                snakeHead: {
                    primary: '#4CAF50',
                    secondary: '#388E3C',
                    powerup: '#FFD700'
                },
                snakeBody: {
                    primary: '#81C784',
                    secondary: '#66BB6A',
                    powerup: '#FFC400'
                },
                food: {
                    apple: {
                        primary: '#F44336',
                        secondary: '#D32F2F'
                    },
                    banana: {
                        primary: '#FFEB3B',
                        secondary: '#FBC02D'
                    },
                    cherry: {
                        primary: '#E91E63',
                        secondary: '#C2185B'
                    },
                    lightning: {
                        primary: '#40C4FF',
                        secondary: '#00B0FF'
                    }
                }
            };

            const FOOD_TYPES = {
                APPLE: 'apple',
                BANANA: 'banana',
                CHERRY: 'cherry',
                LIGHTNING: 'lightning'
            };

            const FOOD_SCORES = {
                [FOOD_TYPES.APPLE]: 1,
                [FOOD_TYPES.BANANA]: 2,
                [FOOD_TYPES.CHERRY]: 3,
                [FOOD_TYPES.LIGHTNING]: 5
            };

            const FOOD_PROBABILITIES = {
                [FOOD_TYPES.APPLE]: 0.5,
                [FOOD_TYPES.BANANA]: 0.25,
                [FOOD_TYPES.CHERRY]: 0.15,
                [FOOD_TYPES.LIGHTNING]: 0.1
            };

            const game = {
                start: function() {
                    if (gameLoop) return;
                    
                    // Reset game state
                    score = 0;
                    gameOver = false;
                    snakeSegments = [{ x: 10, y: 10 }];
                    dx = 0;
                    dy = 0;
                    powerUpActive = false;
                    powerUpTimer = 0;
                    gameStarted = true;
                    lightningEffect = false;
                    GAME_SPEED = 10; // Reset speed
                    
                    // Create initial food
                    food = this.createFood();
                    
                    // Update score display
                    document.getElementById('snake-score').textContent = '0';
                    document.getElementById('snake-high-score').textContent = highScore;
                    
                    // Start game loop
                    lastRenderTime = 0;
                    gameLoop = requestAnimationFrame(game.gameLoop);

                    // Update button states
                    const startBtn = document.querySelector('#snake .start-game');
                    const restartBtn = document.querySelector('#snake .restart-game');
                    if (startBtn) startBtn.disabled = true;
                    if (restartBtn) restartBtn.disabled = false;
                },

                stop: function() {
                    if (gameLoop) {
                        cancelAnimationFrame(gameLoop);
                        gameLoop = null;
                    }
                    gameStarted = false;
                },

                reset: function() {
                    this.stop();
                    this.start();
                },

                createFood: function() {
                    // Generate random position
                    let x, y;
                    let attempts = 0;
                    const maxAttempts = 100;
                    
                    do {
                        x = Math.floor(Math.random() * (tileCount - 2)) + 1; // Keep away from edges
                        y = Math.floor(Math.random() * (tileCount - 2)) + 1;
                        attempts++;
                        
                        // If we can't find a valid position after many attempts
                        if (attempts >= maxAttempts) {
                            // Find first empty spot
                            for (let i = 1; i < tileCount - 1; i++) {
                                for (let j = 1; j < tileCount - 1; j++) {
                                    if (!snakeSegments.some(segment => segment.x === i && segment.y === j)) {
                                        return {
                                            x: i,
                                            y: j,
                                            type: FOOD_TYPES.APPLE
                                        };
                                    }
                                }
                            }
                            // If still no spot found, use center
                            return {
                                x: Math.floor(tileCount / 2),
                                y: Math.floor(tileCount / 2),
                                type: FOOD_TYPES.APPLE
                            };
                        }
                    } while (this.isPositionOccupied(x, y));

                    // Select food type based on probabilities
                    const rand = Math.random();
                    let type = FOOD_TYPES.APPLE;  // Default to apple
                    
                    if (rand < 0.1) {
                        type = FOOD_TYPES.LIGHTNING;
                    } else if (rand < 0.25) {
                        type = FOOD_TYPES.CHERRY;
                    } else if (rand < 0.35) {
                        type = FOOD_TYPES.BANANA;
                    }

                    return {
                        x: x,
                        y: y,
                        type: type
                    };
                },

                isPositionOccupied: function(x, y) {
                    return snakeSegments.some(segment => 
                        Math.abs(segment.x - x) < 1 && Math.abs(segment.y - y) < 1
                    );
                },

                drawFood: function() {
                    if (!food) return;
                    
                    const radius = tileSize / 2;
                    const centerX = food.x * tileSize + radius;
                    const centerY = food.y * tileSize + radius;
                    
                    // Draw main food circle
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.food[food.type].primary;
                    ctx.fill();
                    
                    // Add shine effect
                    ctx.beginPath();
                    ctx.arc(centerX - radius/3, centerY - radius/3, radius/4, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fill();
                },

                drawSnakeSegment: function(x, y, isHead) {
                    const radius = tileSize / 2;
                    const centerX = x * tileSize + radius;
                    const centerY = y * tileSize + radius;

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);

                    if (isHead) {
                        ctx.fillStyle = powerUpActive ? COLORS.snakeHead.powerup : COLORS.snakeHead.primary;
                        ctx.fill();

                        // Draw eyes
                        const eyeRadius = radius / 4;
                        const eyeOffset = radius / 2;
                        ctx.fillStyle = '#000';
                        
                        // Left eye
                        ctx.beginPath();
                        ctx.arc(
                            centerX + (dx * eyeOffset),
                            centerY + (dy * eyeOffset),
                            eyeRadius,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                        
                        // Right eye
                        ctx.beginPath();
                        ctx.arc(
                            centerX - (dy * eyeOffset),
                            centerY + (dx * eyeOffset),
                            eyeRadius,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    } else {
                        ctx.fillStyle = powerUpActive ? COLORS.snakeBody.powerup : COLORS.snakeBody.primary;
                        ctx.fill();
                    }
                },

                drawGrid: function() {
                    ctx.strokeStyle = COLORS.grid;
                    ctx.lineWidth = 0.5;
                    
                    for (let i = 0; i <= tileCount; i++) {
                        const pos = i * tileSize;
                        ctx.beginPath();
                        ctx.moveTo(pos, 0);
                        ctx.lineTo(pos, canvas.height);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(0, pos);
                        ctx.lineTo(canvas.width, pos);
                        ctx.stroke();
                    }
                },

                drawScore: function() {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(`Score: ${score}`, 10, 30);
                    ctx.fillText(`High Score: ${highScore}`, 10, 60);
                    
                    if (powerUpActive) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = COLORS.food[food.type].primary;
                        ctx.fillText(`Power Up: ${Math.ceil(powerUpTimer / GAME_SPEED)}`, canvas.width/2, 30);
                    }
                },

                drawGameOver: function() {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 48px Arial';
                    ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 50);
                    
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2);
                    
                    if (score > highScore) {
                        ctx.fillStyle = '#4CAF50';
                        ctx.fillText('New High Score!', canvas.width/2, canvas.height/2 + 30);
                    }
                    
                    ctx.fillStyle = '#FFD700';
                    ctx.font = '20px Arial';
                    ctx.fillText('Press Space to Restart', canvas.width/2, canvas.height/2 + 60);
                },

                update: function() {
                    if (gameOver || !gameStarted) return;

                    // Update snake position
                    let head = { x: snakeSegments[0].x + dx, y: snakeSegments[0].y + dy };
                    
                    // Wrap around screen edges
                    head.x = (head.x + tileCount) % tileCount;
                    head.y = (head.y + tileCount) % tileCount;
                    
                    // Check self collision
                    if (snakeSegments.length > 1 && snakeSegments.some((segment, index) => 
                        index !== 0 && segment.x === head.x && segment.y === head.y)) {
                        gameOver = true;
                        return;
                    }
                    
                    // Add new head
                    snakeSegments.unshift(head);
                    
                    let shouldGrow = false;
                    // Check food collision with more forgiving hitbox
                    if (food && Math.abs(head.x - food.x) < 1 && Math.abs(head.y - food.y) < 1) {
                        // Increase score
                        score += FOOD_SCORES[food.type];
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('snakeHighScore', highScore);
                        }
                        
                        // Update score display
                        document.getElementById('snake-score').textContent = score;
                        document.getElementById('snake-high-score').textContent = highScore;
                        
                        // Apply power-up effects
                        switch(food.type) {
                            case FOOD_TYPES.LIGHTNING:
                                powerUpActive = true;
                                powerUpTimer = 150;
                                lightningEffect = true;
                                shouldGrow = true;
                                break;
                            case FOOD_TYPES.BANANA:
                                shouldGrow = true;
                                // Add one extra segment for banana
                                snakeSegments.push({ ...snakeSegments[snakeSegments.length - 1] });
                                break;
                            case FOOD_TYPES.CHERRY:
                                GAME_SPEED = Math.min(GAME_SPEED + 1, 15);
                                shouldGrow = true;
                                break;
                            case FOOD_TYPES.APPLE:
                                shouldGrow = true;
                                break;
                        }
                        
                        // Create new food
                        food = this.createFood();
                    }
                    
                    // Remove tail if no growth
                    if (!shouldGrow) {
                        snakeSegments.pop();
                    }
                    
                    // Update power-up timer
                    if (powerUpActive) {
                        powerUpTimer--;
                        if (powerUpTimer <= 0) {
                            powerUpActive = false;
                            lightningEffect = false;
                        }
                    }

                    // Create lightning effect
                    if (lightningEffect && Math.random() < 0.1) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                },

                draw: function() {
                    // Clear canvas
                    ctx.fillStyle = COLORS.background;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw grid (optional, can be removed for cleaner look)
                    if (!powerUpActive) {
                        game.drawGrid();
                    }
                    
                    // Draw snake with gradient effect
                    snakeSegments.forEach((segment, index) => {
                        const progress = index / snakeSegments.length;
                        const alpha = 1 - (progress * 0.5); // Fade out towards tail
                        ctx.globalAlpha = alpha;
                        game.drawSnakeSegment(segment.x, segment.y, index === 0);
                    });
                    ctx.globalAlpha = 1;
                    
                    // Draw food with effects
                    if (food) {
                        game.drawFood();
                        
                        // Add glow effect for power-ups
                        if (food.type === FOOD_TYPES.LIGHTNING) {
                            const radius = tileSize / 2;
                            const centerX = food.x * tileSize + radius;
                            const centerY = food.y * tileSize + radius;
                            
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
                            const gradient = ctx.createRadialGradient(
                                centerX, centerY, radius * 0.5,
                                centerX, centerY, radius * 1.5
                            );
                            gradient.addColorStop(0, 'rgba(64, 196, 255, 0.2)');
                            gradient.addColorStop(1, 'rgba(64, 196, 255, 0)');
                            ctx.fillStyle = gradient;
                            ctx.fill();
                        }
                    }
                    
                    // Draw score
                    game.drawScore();
                },

                gameLoop: function(currentTime) {
                    if (gameOver) {
                        game.stop();
                        game.drawGameOver();
                        return;
                    }

                    gameLoop = requestAnimationFrame(game.gameLoop);

                    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
                    if (secondsSinceLastRender < 1 / GAME_SPEED) return;

                    lastRenderTime = currentTime;
                    game.update();
                    game.draw();
                },
            };

            // Initialize button controls
            const startBtn = document.querySelector('#snake .start-game');
            const restartBtn = document.querySelector('#snake .restart-game');

            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    if (!gameStarted) {
                        game.start();
                    }
                });
            }

            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    game.reset();
                });
                restartBtn.disabled = true;
            }

            // Initial draw to show empty board
            game.draw();

            // Event Listeners for keyboard
            document.addEventListener('keydown', function(e) {
                // Prevent arrow keys from scrolling the screen
                if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                    e.preventDefault();
                }

                if (!gameStarted && e.code !== 'Space') return;

                if (gameOver && e.code === 'Space') {
                    game.reset();
                    return;
                }

                if (!dx && !dy && gameStarted) {
                    switch (e.code) {
                        case 'ArrowUp': dx = 0; dy = -1; break;
                        case 'ArrowDown': dx = 0; dy = 1; break;
                        case 'ArrowLeft': dx = -1; dy = 0; break;
                        case 'ArrowRight': dx = 1; dy = 0; break;
                    }
                    return;
                }

                switch (e.code) {
                    case 'ArrowUp':
                        if (dy !== 1) { dx = 0; dy = -1; }
                        break;
                    case 'ArrowDown':
                        if (dy !== -1) { dx = 0; dy = 1; }
                        break;
                    case 'ArrowLeft':
                        if (dx !== 1) { dx = -1; dy = 0; }
                        break;
                    case 'ArrowRight':
                        if (dx !== -1) { dx = 1; dy = 0; }
                        break;
                }
            });
        }
    },
    pong: {
        init: function() {
            const canvas = document.getElementById('pong-game');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = 800;
            canvas.height = 400;

            const paddleHeight = 60;
            const paddleWidth = 10;
            const ballSize = 8;

            let p1Score = 0;
            let p2Score = 0;
            let pongLoopInterval;

            const paddle1 = {
                y: canvas.height / 2 - paddleHeight / 2,
                dy: 0
            };

            const paddle2 = {
                y: canvas.height / 2 - paddleHeight / 2,
                dy: 0
            };

            const ball = {
                x: canvas.width / 2,
                y: canvas.height / 2,
                dx: 5,
                dy: 3
            };

            document.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'w': paddle1.dy = -5; break;
                    case 's': paddle1.dy = 5; break;
                    case 'ArrowUp': paddle2.dy = -5; break;
                    case 'ArrowDown': paddle2.dy = 5; break;
                }
            });

            document.addEventListener('keyup', (e) => {
                switch (e.key) {
                    case 'w':
                    case 's': paddle1.dy = 0; break;
                    case 'ArrowUp':
                    case 'ArrowDown': paddle2.dy = 0; break;
                }
            });

            function updatePong() {
                // Move paddles
                paddle1.y = Math.max(0, Math.min(canvas.height - paddleHeight, paddle1.y + paddle1.dy));
                paddle2.y = Math.max(0, Math.min(canvas.height - paddleHeight, paddle2.y + paddle2.dy));

                // Move ball
                ball.x += ball.dx;
                ball.y += ball.dy;

                // Ball collisions
                if (ball.y <= 0 || ball.y >= canvas.height) {
                    ball.dy *= -1;
                }

                // Paddle collisions
                if (ball.x <= paddleWidth && ball.y >= paddle1.y && ball.y <= paddle1.y + paddleHeight) {
                    ball.dx *= -1;
                }

                if (ball.x >= canvas.width - paddleWidth && ball.y >= paddle2.y && ball.y <= paddle2.y + paddleHeight) {
                    ball.dx *= -1;
                }

                // Score points
                if (ball.x <= 0) {
                    p2Score++;
                    resetBall();
                }

                if (ball.x >= canvas.width) {
                    p1Score++;
                    resetBall();
                }

                // Draw everything
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = 'yellow';
                // Draw paddles
                ctx.fillRect(0, paddle1.y, paddleWidth, paddleHeight);
                ctx.fillRect(canvas.width - paddleWidth, paddle2.y, paddleWidth, paddleHeight);

                // Draw ball
                ctx.fillRect(ball.x - ballSize / 2, ball.y - ballSize / 2, ballSize, ballSize);

                // Draw scores
                ctx.font = '24px Arial';
                ctx.fillText(p1Score, canvas.width / 4, 30);
                ctx.fillText(p2Score, 3 * canvas.width / 4, 30);

                // Check win condition
                if (p1Score >= 5 || p2Score >= 5) {
                    clearInterval(pongLoopInterval);
                    const winner = p1Score >= 5 ? 'Player 1' :
                        p2Score >= 5 ? 'Player 2' : 'Nobody';
                    alert(winner + ' wins!');
                }
            }

            function resetBall() {
                ball.x = canvas.width / 2;
                ball.y = canvas.height / 2;
                ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
                ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
            }

            // Add restart button functionality
            const restartBtn = document.querySelector('#pong .restart-game');
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    p1Score = 0;
                    p2Score = 0;
                    resetBall();
                    paddle1.y = canvas.height/2 - paddleHeight/2;
                    paddle2.y = canvas.height/2 - paddleHeight/2;
                    if (pongLoopInterval) clearInterval(pongLoopInterval);
                    pongLoopInterval = setInterval(updatePong, 1000/60);
                });
            }

            document.querySelector('#pong .start-game').addEventListener('click', () => {
                p1Score = 0;
                p2Score = 0;
                resetBall();
                if (pongLoopInterval) clearInterval(pongLoopInterval);
                pongLoopInterval = setInterval(updatePong, 1000/60);
            });
        }
    },
    memory: {
        init: function() {
            let cards = [];
            let flippedCards = [];
            let matchedPairs = 0;
            let currentPlayer = 1;
            let scores = { 1: 0, 2: 0 };
            let canFlip = true;

            const board = document.querySelector('.memory-board');
            const score1 = document.getElementById('memory-score-1');
            const score2 = document.getElementById('memory-score-2');
            const gameStatus = document.querySelector('#memory .game-status');

            if (!board) return;

            const cardSymbols = ['♠', '♣', '♥', '♦', '★', '♠', '♣', '♥', '♦', '★', '☀', '☾', '☀', '☾', '♫', '♫'];

            function updateScores() {
                if (score1) score1.textContent = scores[1];
                if (score2) score2.textContent = scores[2];
            }

            function updateStatus(message) {
                if (gameStatus) {
                    gameStatus.textContent = message;
                    gameStatus.classList.add('active');
                }
            }

            function createBoard() {
                cards = [...cardSymbols];
                shuffleArray(cards);

                board.innerHTML = cards.map((symbol, index) => `
                    <div class="memory-card" data-card-index="${index}">
                        <div class="card-inner">
                            <div class="card-front">?</div>
                            <div class="card-back">${symbol}</div>
                        </div>
                    </div>
                `).join('');

                document.querySelectorAll('.memory-card').forEach(card => {
                    card.addEventListener('click', handleCardClick);
                });
            }

            function handleCardClick(e) {
                if (!canFlip) return;

                const card = e.currentTarget;
                if (card.classList.contains('flipped') || flippedCards.includes(card)) return;

                card.classList.add('flipped');
                flippedCards.push(card);

                if (flippedCards.length === 2) {
                    canFlip = false;
                    checkMatch();
                }
            }

            function checkMatch() {
                const [card1, card2] = flippedCards;
                const symbol1 = cards[parseInt(card1.dataset.cardIndex)];
                const symbol2 = cards[parseInt(card2.dataset.cardIndex)];

                if (symbol1 === symbol2) {
                    scores[currentPlayer]++;
                    matchedPairs++;
                    updateScores();

                    if (matchedPairs === cardSymbols.length / 2) {
                        const winner = scores[1] > scores[2] ? 1 : scores[1] < scores[2] ? 2 : 'Draw';
                        updateStatus(winner === 'Draw' ? "It's a Draw!" : `Player ${winner} Wins!`);
                    }

                    flippedCards = [];
                    canFlip = true;
                } else {
                    setTimeout(() => {
                        card1.classList.remove('flipped');
                        card2.classList.remove('flipped');
                        flippedCards = [];
                        currentPlayer = currentPlayer === 1 ? 2 : 1;
                        updateStatus(`Player ${currentPlayer}'s turn`);
                        canFlip = true;
                    }, 1000);
                }
            }

            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
            }

            function resetGame() {
                scores = { 1: 0, 2: 0 };
                matchedPairs = 0;
                currentPlayer = 1;
                flippedCards = [];
                canFlip = true;
                updateScores();
                updateStatus("Player 1's turn");
                createBoard();
            }

            // Add restart button functionality
            const restartBtn = document.querySelector('#memory .restart-game');
            if (restartBtn) {
                restartBtn.addEventListener('click', resetGame);
            }

            // Add start button functionality
            const startBtn = document.querySelector('#memory .start-game');
            if (startBtn) {
                startBtn.addEventListener('click', resetGame);
            }

            // Initialize the game
            createBoard();
            updateScores();
            updateStatus("Player 1's turn");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Navigation menu clicks
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Game card clicks
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const game = card.getAttribute('data-game');
            navigateToPage(game);
        });
    });

    // Start game button clicks
    const startButtons = document.querySelectorAll('.start-game');
    startButtons.forEach(button => {
        button.addEventListener('click', () => {
            const gameSection = button.closest('.game-section');
            if (gameSection) {
                const gameId = gameSection.id;
                if (gameModules[gameId] && !gameInitialized[gameId]) {
                    gameModules[gameId].init();
                    gameInitialized[gameId] = true;
                }
            }
        });
    });
});

function navigateToPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
    });

    // Show selected page
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.style.display = 'block';
    }

    // Update navigation menu active state
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
}

// Initialize home page by default
window.addEventListener('load', () => {
    navigateToPage('home');
});
