"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const userModel_1 = require("./userModel");
const transactionController_1 = require("../transactions/transactionController");
const transactionController = new transactionController_1.TransactionController();
class UserService {
    findUserByUsername(username, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield userModel_1.User.findOne({ username }).session(session || null);
        });
    }
    findPlayerByUsername(username, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield userModel_1.Player.findOne({ username }).session(session || null);
        });
    }
    findUserById(id, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield userModel_1.User.findById(id).session(session || null);
        });
    }
    findPlayerById(id, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield userModel_1.Player.findById(id).session(session || null);
        });
    }
    createUser(userData, credits, hashedPassword, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = new userModel_1.User(Object.assign(Object.assign({}, userData), { credits: credits, password: hashedPassword }));
            yield user.save({ session });
            return user;
        });
    }
    createPlayer(userData, credits, hashedPassword, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const player = new userModel_1.Player(Object.assign(Object.assign({}, userData), { credits: credits, password: hashedPassword }));
            yield player.save({ session });
            return player;
        });
    }
    createTransaction(type, creator, user, amount, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return transactionController.createTransaction(type, creator, user, amount, session);
        });
    }
    findUsersByIds(ids, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return userModel_1.User.find({ _id: { $in: ids } }).session(session || null);
        });
    }
    findPlayersByIds(ids, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return userModel_1.Player.find({ _id: { $in: ids } }).session(session || null);
        });
    }
    deleteUserById(id, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return userModel_1.User.findByIdAndDelete(id).session(session || null);
        });
    }
    deletePlayerById(id, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return userModel_1.Player.findByIdAndDelete(id).session(session || null);
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    getRandomChar(characters) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex];
    }
    shuffleString(str) {
        const arr = str.split("");
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join("");
    }
    getAllSubordinateIds(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            let allSubordinateIds = [];
            if (role === "store") {
                // Fetch subordinates from the Player collection
                const directSubordinates = yield userModel_1.Player.find({ createdBy: userId }, { _id: 1 });
                const directSubordinateIds = directSubordinates.map(sub => sub._id);
                allSubordinateIds = [...directSubordinateIds];
            }
            else {
                // Fetch subordinates from the User collection
                const directSubordinates = yield userModel_1.User.find({ createdBy: userId }, { _id: 1, role: 1 });
                const directSubordinateIds = directSubordinates.map(sub => sub._id);
                allSubordinateIds = [...directSubordinateIds];
                // If the role is company, also fetch subordinates from the Player collection
                if (role === "supermaster") {
                    const directPlayerSubordinates = yield userModel_1.Player.find({ createdBy: userId }, { _id: 1 });
                    const directPlayerSubordinateIds = directPlayerSubordinates.map(sub => sub._id);
                    allSubordinateIds = [...allSubordinateIds, ...directPlayerSubordinateIds];
                }
                for (const sub of directSubordinates) {
                    const subSubordinateIds = yield this.getAllSubordinateIds(sub._id, sub.role);
                    allSubordinateIds = [...allSubordinateIds, ...subSubordinateIds];
                }
            }
            return allSubordinateIds;
        });
    }
}
exports.default = UserService;
