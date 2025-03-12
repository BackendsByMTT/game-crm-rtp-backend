import cluster from "cluster";
import { Server } from "socket.io";

export function setupWebSocket(server: any, corsOptions: any) {
    const io = new Server(server, { cors: corsOptions });

    // Track connected users
    const connectedUsers = new Map();

    // RTP (Return to Player) settings
    const gameSettings = {
        defaultRTP: 0.95,
        winProbability: 0.45,
    };

    // **Platform Namespace**
    const platformNamespace = io.of('/platform');
    platformNamespace.on('connection', (socket) => {
        console.log(`👤 User connected to /platform (ID: ${socket.id}, Worker: ${cluster.worker?.id})`);

        socket.on('login', (data) => {
            console.log(`🔑 User Login Attempt:`, data);
            socket.emit('login-success', { message: 'Welcome to the platform!' });
        });

        socket.on('disconnect', () => {
            console.log(`👤 User disconnected from /platform (ID: ${socket.id})`);
        });
    });

    // **Game Namespace**
    const gameNamespace = io.of('/game');
    gameNamespace.on('connection', (socket) => {
        console.log(`🎮 User connected to /game (ID: ${socket.id}, Worker: ${cluster.worker.id})`);

        socket.on('join', (data) => {
            const { username } = data;
            console.log(`👤 User ${username} joined the game`);

            // Store user info
            connectedUsers.set(socket.id, {
                username,
                balance: 1000, // Initial balance
                spins: 0,
                wins: 0,
                losses: 0
            });
        });

        socket.on('spin', (data) => {
            const user = connectedUsers.get(socket.id);
            if (!user) return;

            // Get bet amount from request or use default
            const betAmount = data.bet || 10;

            // Track spin activity
            user.spins++;

            // Calculate outcome based on RTP settings
            const isWin = Math.random() <= gameSettings.winProbability;

            // Update user stats
            if (isWin) {
                user.wins++;
                user.balance += betAmount * 5; // 5x win multiplier
            } else {
                user.losses++;
                user.balance -= betAmount;
            }

            console.log(`🎰 Spin result for ${user.username}: ${isWin ? 'Win' : 'Lose'} : ${cluster.worker.id}`);

            // Send result back to client
            socket.emit('spin-result', {
                result: isWin ? 'Win' : 'Lose',
                balance: user.balance,
                stats: {
                    totalSpins: user.spins,
                    wins: user.wins,
                    losses: user.losses
                }
            });
        });

        socket.on('disconnect', () => {
            console.log(`🎮 User disconnected from /game (ID: ${socket.id})`);
            // Clean up user data
            connectedUsers.delete(socket.id);
        });
    });
    console.log(`⚡ WebSocket server running on worker ${cluster.worker?.id}`);
}