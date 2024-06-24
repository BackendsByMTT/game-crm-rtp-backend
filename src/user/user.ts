import { Socket } from "socket.io";
import { MESSAGEID, MESSAGETYPE } from "../utils/utils";
import {
  checkforMoolah,
  gameSettings,
  playerData,
  spinResult,
} from "../game/global";
import { CheckResult } from "../game/slotResults";
import { getRTP } from "../game/rtpgenerator";
import { verifySocketToken } from "../middleware/authMiddleware";
import User from "../dashboard/user/userModel";
export let users: Map<string, SocketUser> = new Map();
import { Game, Payouts } from "../dashboard/casinoGames/gamesModel";
import { clientData } from "../dashboard/user/userController";

export class SocketUser {
  socket: Socket;
  isAlive: boolean = false;
  username: string;
  designation: string;
  constructor(socket: Socket, public GameData: any) {
    this.isAlive = true;
    this.socket = socket;
    this.username = socket?.data?.username;
    this.designation = socket?.data?.designation;
    this.handleAuth();
    this.socket.on("pong", this.heartbeat);
    this.socket.on("message", this.messageHandler());
    this.socket.on(MESSAGEID.AUTH, this.initGameData);
    this.socket.on("disconnect", () => this.deleteUserFromMap());
  }

  initGameData = async (message: any) => {
    const messageData = JSON.parse(message);
    const game = await Game.findOne({ tagName: messageData.Data.GameID });

    if (!game.payout.length) {
      this.sendError("404", "Game with the specified tagName not found.");
      this.socket.disconnect();
      return;
    }
    // Retrieve the payout JSON data
    const payoutData = await Payouts.find({ _id: { $in: game.payout } });
    gameSettings.initiate(payoutData[0].data, this.socket.id);
  };

  sendError(errorCode: string, message: any) {
    const params = {
      errorCode: errorCode,
      message: message,
    };
    console.log("ERROR " + errorCode + "  :  " + message);
    this.socket.emit(MESSAGETYPE.ERROR, params);
  }

  sendAlert(message: string) {
    this.socket.emit(MESSAGETYPE.ALERT, message);
  }

  sendMessage(id: string, message: any) {
    this.socket.emit(MESSAGETYPE.MESSAGE, JSON.stringify({ id, message }));
  }

  heartbeat = () => {
    this.isAlive = true;
  };

  messageHandler = () => {
    return (message: any) => {
      const messageData = JSON.parse(message);
      if (messageData.id === "checkMoolah") {
        checkforMoolah();
      }
      if (messageData.id === MESSAGEID.SPIN && gameSettings.startGame) {
        gameSettings.currentBet = messageData.data.currentBet;
        spinResult(this.socket.id);
      }
      if (messageData.id == MESSAGEID.GENRTP) {
        console.log();
        
        gameSettings.currentBet = messageData.data.currentBet;
        getRTP(this.socket.id, messageData.data.spins);
      }

      if (messageData.id === MESSAGEID.GAMBLE) {
      }
    };
  };

  //to get the player initial balance after socket connection
  async handleAuth() {
    try {
      // const messageData = JSON.parse(message);
      const CurrentUser = await User.findOne({
        username: this.username,
      }).exec();
      if (CurrentUser) {
        playerData.Balance = CurrentUser.credits;
        // console.log(playerData.Balance);
        // console.log(this.username);
        // console.log("Player Balance users", CurrentUser.credits);
        this.sendMessage(MESSAGEID.AUTH, CurrentUser.credits);
      } else {
        this.sendError("USER_NOT_FOUND", "User not found in the database");
      }
    } catch (error) {
      console.error("Error handling AUTH message:", error);
      this.sendError("AUTH_ERROR", "An error occurred during authentication");
    }
  }

  deleteUserFromMap = () => {
    // Attempt to delete the user from the map
    const clientID = this.socket.id;
    if (getClient(clientID)) {
      users.delete(clientID);
      console.log(`User with ID ${clientID} was successfully removed.`);
    } else {
      console.log(`No user found with ID ${clientID}.`);
    }
  };

  //Update player credits case win ,bet,and lose;
  async updateCreditsInDb(finalBalance: number) {
    await User.findOneAndUpdate(
      { username: this.username },
      {
        credits: finalBalance,
      }
    );
  }
}

export async function initializeUser(socket: Socket) {
  try {
    const decoded = await verifySocketToken(socket);
    socket.data.username = decoded.username;
    socket.data.designation = decoded.designation;
    const user = new SocketUser(socket, socket);
    users.set(user.socket.id, user);
    // Send the game and payout data to the client
    // socket.emit("initialize", { game, payoutData });
  } catch (err) {
    console.error(err.message);
    socket.disconnect();
  }
}

export function getClient(clientId: string) {
  const user = users.get(clientId);
  return user;
}
