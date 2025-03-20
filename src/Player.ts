
import { Socket } from "socket.io";
import mongoose from "mongoose";
import { Player } from "./dashboard/users/userModel";
import { Platform } from "./dashboard/games/gameModel";
import payoutController from "./dashboard/payouts/payoutController";
import { getPlayerCredits, messageType } from "./game/Utils/gameUtils";
import { gameData } from "./game/testData";
import GameManager from "./game/GameManager";
import createHttpError from "http-errors";
import { socketConnectionData } from "./utils/utils";
import { sessionManager } from "./dashboard/session/sessionManager";
import { GameSession } from "./dashboard/session/gameSession";
import { redisClient } from "./config/redis";
import { NewEventType } from "./utils/eventTypes";


export interface currentGamedata {
  username: string,
  gameId: string | null;
  gameSettings: any;
  currentGameManager: GameManager;
  session: GameSession | null;
  socket: Socket | null;
  heartbeatInterval: NodeJS.Timeout;

  sendMessage: (action: string, message: any, isGameSocket: boolean) => void;
  sendError: (message: string, isGameSocket: boolean) => void;
  sendAlert: (message: string, isGameSocket: boolean) => void;
  updatePlayerBalance: (message: number) => void;
  deductPlayerBalance: (message: number) => void;
  getPlayerData: () => playerData;
}

export interface playerData {
  username: string;
  role: string;
  credits: number;
  userAgent: string;
  status: string,
}


export default class PlayerSocket {
  platformData: socketConnectionData;
  currentGameData: currentGamedata;

  playerData: playerData;
  initialCredits: number;
  public managerName: string | null;
  entryTime: Date;
  exitTime: Date | null = null;
  currentRTP: number = 0;
  currentGameSession: GameSession | null = null;


  constructor(username: string, role: string, status: string, credits: number, userAgent: string, socket: Socket, managerName: string) {

    this.playerData = {
      username, role, credits, userAgent, status
    };

    this.entryTime = new Date();
    this.initialCredits = credits;
    this.managerName = managerName

    this.platformData = {
      socket: socket,
      heartbeatInterval: setInterval(() => { }, 0),
      reconnectionAttempts: 0,
      maxReconnectionAttempts: 3,
      reconnectionTimeout: 1000,
      cleanedUp: false,
      platformId: socket.handshake.auth.platformId

    }

    this.currentGameData = {
      username: this.playerData.username,
      gameId: null,
      gameSettings: null,
      currentGameManager: null,
      session: null,
      socket: null,
      heartbeatInterval: setInterval(() => { }, 0),

      sendMessage: this.sendMessage.bind(this),
      sendError: this.sendError.bind(this),
      sendAlert: this.sendAlert.bind(this),
      updatePlayerBalance: this.updatePlayerBalance.bind(this),
      deductPlayerBalance: this.deductPlayerBalance.bind(this),
      getPlayerData: () => this.playerData,
    };

    this.initializePlatformSocket(socket);
    this.subscribeToRedisEvents();
  }

  private subscribeToRedisEvents() {
    redisClient.subClient.subscribe(`player:${this.playerData.username}`, (message) => {
      const data = JSON.parse(message);
      console.log(`🔄 Syncing player state for ${this.playerData.username}:`, data);

      switch (data.type) {
        case "UPDATE_BALANCE":
          this.playerData.credits = data.payload.credits;
          this.sendData({ type: "CREDIT", data: { credits: this.playerData.credits } }, "platform");
          break;

        case NewEventType.UPDATE_PAYOUT:
          if (this.currentGameData.gameId === data.payload.tagName) {
            console.log(`🎮 Updating game settings for ${this.playerData.username}`);

            // Update game settings dynamically
            this.currentGameData.gameSettings = data.payload.payoutData;
            this.currentGameData.currentGameManager.currentGameType.currentGame.initialize(data.payload.payoutData);

            this.sendAlert(`Game ${data.payload.tagName} updated to version ${data.payload.newVersion}`, true);
          }



        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    })
  }


  public async initializePlatformSocket(socket: Socket) {
    try {
      if (this.currentGameData.socket) {
        await this.cleanupGameSocket()
      }

      this.platformData.socket = socket;
      this.platformData.platformId = socket.handshake.auth.platformId;

      this.messageHandler(false);
      this.onExit();

      if (this.platformData.socket) {
        this.platformData.socket.on("disconnect", () => {
          this.handlePlatformDisconnection()
        })
      } else {
        console.error("Socket is null during initialization of disconnect event");
      }

      await sessionManager.startSession(this);
    } catch (error) {
      console.error("Error initializing platform socket:", error);
    }
  }

  private async initializeGameSocket(socket: Socket) {

    if (this.currentGameData.socket) {
      this.cleanupGameSocket();
    }

    this.currentGameData.socket = socket;
    this.currentGameData.gameId = socket.handshake.auth.gameId;
    this.currentGameData.socket.on("disconnect", () => this.handleGameDisconnection());
    this.initGameData();
    this.startGameHeartbeat();
    this.onExit(true)
    this.messageHandler(true);
    this.currentGameData.socket.emit("socketState", true);

    await sessionManager.startGame(this);
  }

  // Handle platform disconnection and reconnection
  private handlePlatformDisconnection() {
    if (process.env.NODE_ENV == "testing") return;
    this.attemptReconnection(this.platformData)
  }

  // Handle game disconnection - immediately clean up without reconnection attempts
  private handleGameDisconnection() {
    if (process.env.NODE_ENV == "testing") return;
    this.cleanupGameSocket();
  }

  // Cleanup only the game socket
  private async cleanupGameSocket() {
    try {
      await sessionManager.endGame(this);
    } catch (error) {
      console.error(`❌ Error cleaning up game session for ${this.playerData.username}:`, error);
    }
  }

  public async cleanupPlatformSocket() {
    try {
      await sessionManager.endSession(this);

      if (this.platformData.socket) {
        this.platformData.platformId = null;
        this.platformData.socket.disconnect(true);
        this.platformData.socket = null;
      }

      clearInterval(this.platformData.heartbeatInterval);
      this.platformData.reconnectionAttempts = 0;
      this.platformData.cleanedUp = true;

    } catch (error) {
      console.error("Error cleaning up platform socket:")
    }
  }

  // Attempt reconnection  for platform or game socket based on provided data
  private async attemptReconnection(socketData: socketConnectionData) {
    try {
      while (socketData.reconnectionAttempts < socketData.maxReconnectionAttempts) {
        console.log(`Reconnecting: ${socketData.reconnectionAttempts}...`);


        // If the user has already reconnected with a new socket, stop reconnection attempts
        if (socketData.socket && socketData.socket.connected) {
          console.log("Reconnection successful");
          socketData.reconnectionAttempts = 0;  // Reset reconnection attempts
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, socketData.reconnectionTimeout));
        socketData.reconnectionAttempts++;

        if (socketData.cleanedUp) return;
      }

      if (socketData === this.platformData) {
        await this.cleanupPlatformSocket();
      } else {
        await this.cleanupGameSocket();
      }
    } catch (error) {
      console.error("Reconnection attempt failed:", error);
    }
  }


  // Start heartbeat for game socket
  private startGameHeartbeat() {
    if (this.currentGameData.socket) {
      this.currentGameData.heartbeatInterval = setInterval(() => {
        if (this.currentGameData.socket && this.currentGameData.gameId) {
          this.sendAlert(`${this.playerData.username} : ${this.currentGameData.gameId}`)
        }
      }, 20000)
    }
  }

  public async updateGameSocket(socket: Socket) {
    if (!this.platformData.socket || !this.platformData.socket.connected) {
      console.log("Game connection blocked - platform connection missing.");
      socket.emit(messageType.ERROR, "Platform connection required.");
      socket.disconnect(true);
      throw createHttpError(403, "Platform connection required before joining a game.");
    }
    const MOBILE_USER_AGENT_REGEX = /android|iphone|ipad|ipod|mobile|okhttp/i;
    const isMobile = this.playerData.userAgent ? MOBILE_USER_AGENT_REGEX.test(this.playerData.userAgent) : false;

    // Skip user-agent validation in the testing environment
    if (process.env.NODE_ENV !== "testing") {
      if (!isMobile && (socket.request.headers["user-agent"] !== this.playerData.userAgent)) {
        socket.emit("alert", {
          id: "AnotherDevice",
          message: "You are already playing on another browser",
        });
        socket.disconnect(true);
        throw createHttpError(403, "You are already playing on another browser");
      }
    } else {
      console.log("Testing environment detected. Skipping user-agent validation.");
    }
    socket.emit(messageType.ALERT, "Initializing game socket connection.");

    // Delay-based retry to ensure platform stability
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("Initializing game socket connection after platform stability confirmed.");

    this.initializeGameSocket(socket);
    const credits = await getPlayerCredits(this.playerData.username);
    this.playerData.credits = typeof credits === "number" ? credits : 0;
    // this.sendMessage("connected-With", this.playerData.username, true);
  }

  private async initGameData() {
    if (!this.currentGameData.socket) return;

    try {
      const tagName = this.currentGameData.gameId;
      const platform = await Platform.aggregate([
        { $unwind: "$games" },
        { $match: { "games.tagName": tagName, "games.status": "active" } },
        { $project: { _id: 0, game: "$games" } },
      ]);

      if (platform.length === 0) {
        this.currentGameData.gameSettings = { ...gameData[0] };
        this.currentGameData.currentGameManager = new GameManager(this.currentGameData);
        return;
      }

      const game = platform[0].game;
      const payout = await payoutController.getPayoutVersionData(game.tagName, game.payout);

      if (!payout) {
        this.currentGameData.gameSettings = { ...gameData[0] };
        this.currentGameData.currentGameManager = new GameManager(this.currentGameData);
        return;
      }

      this.currentGameData.gameSettings = { ...payout };
      this.currentGameData.currentGameManager = new GameManager(this.currentGameData);
    } catch (error) {
      console.error(`Error initializing game data for user ${this.playerData.username}:`, error);
    }
  }

  public sendMessage(action: string, message: any, isGameSocket: boolean = false) {
    const socket = isGameSocket ? this.currentGameData.socket : this.platformData.socket;
    if (socket) {
      socket.emit(
        messageType.MESSAGE,
        JSON.stringify({ id: action, message, username: this.playerData.username })
      )
    }
  }

  public sendData(data: any, type: "platform" | "game"): void {
    try {
      const socket = type === "platform" ? this.platformData.socket : this.currentGameData.socket;
      if (socket) {
        socket.emit(messageType.DATA, data)
      }
    } catch (error) {
      console.error(`Error sending data to ${this.playerData.username}'s platform`)
      console.error(error)
    }
  }

  // Send an error message to the client (either platform or game)
  public sendError(message: string, isGameSocket: boolean = false) {
    const socket = isGameSocket ? this.currentGameData.socket : this.platformData.socket;
    if (socket) {
      socket.emit(messageType.ERROR, message)
    }
  }

  // Send an alert to the client (platform or game)
  public sendAlert(message: string, isGameSocket: boolean = false) {
    const socket = isGameSocket ? this.currentGameData.socket : this.platformData.socket;
    if (socket) {
      socket.emit(messageType.ALERT, message)
    }
  }

  // Handle client message communication for the game socket
  private messageHandler(isGameSocket: boolean = false) {
    const socket = isGameSocket ? this.currentGameData.socket : this.platformData.socket;

    if (socket) {
      socket.on("message", (message) => {
        try {
          const response = JSON.parse(message);

          if (isGameSocket) {
            // Delegate message to the current game manager's handler for game-specific logic
            this.currentGameData.currentGameManager.currentGameType.currentGame.messageHandler(response);
          } else {
            // Handle platform-specific messages here if needed
            console.log(`Platform message received: ${response}`);
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
          this.sendError("Failed to parse message", isGameSocket);
        }
      })
    }
  }

  // Handle user exit event for the game or platform
  public onExit(isGameSocket: boolean = false) {
    const socket = isGameSocket ? this.currentGameData.socket : this.platformData.socket;
    if (socket) {
      socket.on("EXIT", async () => {
        if (isGameSocket) {
          this.sendMessage('ExitUser', '', true);  // Notify game exit
          await this.cleanupGameSocket(); // Clean up game socket
        } else {
          await this.cleanupPlatformSocket(); // Clean up platform socket
        }
      })
    }
  }

  public async forceExit(isGameSocket: boolean = false) {
    // Send a forced exit alert to the correct socket (game or platform)
    this.sendAlert("ForcedExit", isGameSocket);
    // If the user is exiting the game, only clean up the game socket

    if (isGameSocket) {
      await this.cleanupGameSocket();  // Clean up the game socket only
    } else {
      // If the user is exiting the platform, clean up both platform and game sockets and remove from the users map
      await this.cleanupPlatformSocket();  // Clean up the platform socket
      await this.cleanupGameSocket();  // Optionally, also clean up the game socket if needed
    }
  }

  private async updateDatabase() {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const finalBalance = this.playerData.credits;
      await Player.findOneAndUpdate(
        { username: this.playerData.username },
        { credits: finalBalance.toFixed(2) },
        { new: true, session }
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      // console.error("Failed to update database:", error);
      this.sendError("Database error");
    } finally {
      session.endSession();
    }
  }

  private checkPlayerBalance(bet: number) {
    if (this.playerData.credits < bet) {
      this.sendMessage("low-balance", true);
      console.error("LOW BALANCE");
    }
  }

  public async updatePlayerBalance(credit: number) {
    try {
      this.playerData.credits += credit;
      await this.updateDatabase();
    } catch (error) {
      console.error("Error updating credits in database:", error);
    }
  }

  public async deductPlayerBalance(currentBet: number) {
    this.checkPlayerBalance(currentBet);
    this.playerData.credits -= currentBet;
  }


  public getSummary() {
    return {
      playerId: this.playerData.username,
      status: this.playerData.status,
      managerName: this.managerName,
      initialCredits: this.initialCredits,
      currentCredits: this.playerData.credits,
      entryTime: this.entryTime,
      exitTime: this.exitTime,
      currentRTP: this.currentRTP,
      currentGame: this.currentGameSession?.getSummary() || null,
      userAgent: this.playerData.userAgent,
      platformId: this.platformData.platformId
    }
  }

  public setExitTime() {
    this.exitTime = new Date()
  }
}
