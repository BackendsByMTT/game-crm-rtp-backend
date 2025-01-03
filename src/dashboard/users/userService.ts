import mongoose from "mongoose";
import { Player, User } from "./userModel";
import { IPlayer, IUser } from "./userType";
import { TransactionController } from "../transactions/transactionController";

const transactionController = new TransactionController()

export default class UserService {


  async findUserByUsername(username: string, session?: mongoose.ClientSession) {
    return await User.findOne({ username }).session(session || null);
  }

  async findPlayerByUsername(username: string, session?: mongoose.ClientSession) {
    return await Player.findOne({ username }).session(session || null);
  }



  async findUserById(id: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    return await User.findById(id).session(session || null);
  }

  async findPlayerById(id: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    return await Player.findById(id).session(session || null)
  }

  async createUser(userData: Partial<IUser>, credits: number, hashedPassword: string, session: mongoose.ClientSession) {
    const user = new User({
      ...userData,
      credits: credits,
      password: hashedPassword,
    });
    await user.save({ session });
    return user;
  }

  async createPlayer(userData: Partial<IPlayer>, credits: number, hashedPassword: string, session: mongoose.ClientSession) {
    const player = new Player({
      ...userData,
      credits: credits,
      password: hashedPassword,
    });
    await player.save({ session });
    return player;
  }

  async createTransaction(type: string, creator: IUser, user: IUser | IPlayer, amount: number, session: mongoose.ClientSession) {
    return transactionController.createTransaction(type, creator, user, amount, session);
  }

  async findUsersByIds(ids: mongoose.Types.ObjectId[], session?: mongoose.ClientSession) {
    return User.find({ _id: { $in: ids } }).session(session || null);
  }

  async findPlayersByIds(ids: mongoose.Types.ObjectId[], session?: mongoose.ClientSession) {
    return Player.find({ _id: { $in: ids } }).session(session || null);
  }

  public async deleteUserById(id: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    return User.findByIdAndDelete(id).session(session || null);
  }

  public async deletePlayerById(id: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    return Player.findByIdAndDelete(id).session(session || null);
  }

  async getAll() {

  }

  getRandomChar(characters: string) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    return characters[randomIndex];
  }

  shuffleString(str: string) {
    const arr = str.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }

  async getAllSubordinateIds(userId: mongoose.Types.ObjectId, role: string): Promise<mongoose.Types.ObjectId[]> {
    let allSubordinateIds: mongoose.Types.ObjectId[] = [];

    if (role === "store") {
      // Fetch subordinates from the Player collection
      const directSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
      const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
      allSubordinateIds = [...directSubordinateIds];
    } else {
      // Fetch subordinates from the User collection
      const directSubordinates = await User.find({ createdBy: userId }, { _id: 1, role: 1 });
      const directSubordinateIds = directSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
      allSubordinateIds = [...directSubordinateIds];

      // If the role is company, also fetch subordinates from the Player collection
      if (role === "supermaster") {
        const directPlayerSubordinates = await Player.find({ createdBy: userId }, { _id: 1 });
        const directPlayerSubordinateIds = directPlayerSubordinates.map(sub => sub._id as mongoose.Types.ObjectId);
        allSubordinateIds = [...allSubordinateIds, ...directPlayerSubordinateIds];
      }

      for (const sub of directSubordinates) {
        const subSubordinateIds = await this.getAllSubordinateIds(sub._id as mongoose.Types.ObjectId, sub.role);
        allSubordinateIds = [...allSubordinateIds, ...subSubordinateIds];
      }
    }

    return allSubordinateIds;
  }

}
