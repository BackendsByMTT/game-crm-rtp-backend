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
exports.sessionManager = void 0;
const utils_1 = require("../../utils/utils");
const userModel_1 = require("../users/userModel");
const gameSession_1 = require("./gameSession");
const sessionModel_1 = require("./sessionModel");
class SessionManager {
    constructor() {
        this.platformSessions = new Map();
        this.currentActiveManagers = new Map();
    }
    startPlatformSession(player) {
        return __awaiter(this, void 0, void 0, function* () {
            this.platformSessions.set(player.playerData.username, player);
            try {
                const platformSessionData = new sessionModel_1.PlatformSessionModel(player.getSummary());
                yield platformSessionData.save();
                yield this.notifyManagers(player.managerName, utils_1.eventType.ENTERED_PLATFORM, player.getSummary());
            }
            catch (error) {
                console.error(`Failed to save platform session for player: ${player.playerData.username}`, error);
            }
            finally {
                console.log(`PLATFORM STARTED : `, player.playerData.username);
            }
        });
    }
    endPlatformSession(playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platformSession = this.getPlayerPlatform(playerId);
                if (platformSession) {
                    platformSession.setExitTime();
                    this.platformSessions.delete(playerId);
                    yield this.notifyManagers(platformSession.managerName, utils_1.eventType.EXITED_PLATFORM, platformSession.getSummary());
                    yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: playerId, entryTime: platformSession.entryTime }, { $set: { exitTime: platformSession.exitTime } });
                }
            }
            catch (error) {
                console.error(`Failed to save platform session for player: ${playerId}`, error);
            }
        });
    }
    startGameSession(playerId, gameId, credits) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const platformSession = this.getPlayerPlatform(playerId);
            if (platformSession) {
                platformSession.currentGameSession = new gameSession_1.GameSession(playerId, gameId, credits);
                platformSession.currentGameSession.on("spinUpdated", (summary) => __awaiter(this, void 0, void 0, function* () {
                    yield this.notifyManagers(platformSession.managerName, utils_1.eventType.UPDATED_SPIN, summary);
                }));
                platformSession.currentGameSession.on("sessionEnded", (summary) => __awaiter(this, void 0, void 0, function* () {
                    yield this.notifyManagers(platformSession.managerName, utils_1.eventType.EXITED_GAME, summary);
                }));
                const gameSummary = (_a = platformSession.currentGameSession) === null || _a === void 0 ? void 0 : _a.getSummary();
                if (gameSummary) {
                    yield this.notifyManagers(platformSession.managerName, utils_1.eventType.ENTERED_GAME, gameSummary);
                }
                else {
                    console.error(`No active platform session found for player: ${playerId}`);
                }
            }
            else {
                console.error(`No active platform session found for player: ${playerId}`);
            }
        });
    }
    endGameSession(playerId, credits) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const platformSession = this.getPlayerPlatform(playerId);
                if (platformSession && platformSession.currentGameSession) {
                    // End and delete the current game session
                    platformSession.currentGameSession.endSession(platformSession.playerData.credits);
                    const gameSessionData = platformSession.currentGameSession.getSummary();
                    yield this.notifyManagers(platformSession.managerName, utils_1.eventType.EXITED_GAME, gameSessionData);
                    yield sessionModel_1.PlatformSessionModel.updateOne({ playerId: playerId, entryTime: platformSession.entryTime }, { $push: { gameSessions: gameSessionData }, $set: { currentRTP: platformSession.currentRTP } });
                    platformSession.currentGameSession = null;
                    console.log(`Current game session deleted for player: ${playerId}`);
                }
            }
            catch (error) {
                console.error(`Failed to delete the current game session for player: ${playerId}`, error);
            }
        });
    }
    notifyManagers(managerName, eventType, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = this.getActiveManagerByRole('admin');
                if (admin) {
                    admin.notifyManager({ type: eventType, payload });
                }
                const manager = yield userModel_1.User.findOne({ username: managerName }).exec();
                if (manager.role === 'store') {
                    // Get top hierarchy user until company and notify company, store, and admin
                    const topUser = yield this.getTopUserUntilCompany(manager.username);
                    if (topUser) {
                        const companyManager = this.getActiveManagerByUsername(topUser.username);
                        if (companyManager) {
                            companyManager.notifyManager({ type: eventType, payload });
                        }
                    }
                    const storeManager = this.getActiveManagerByUsername(manager.username);
                    if (storeManager) {
                        storeManager.notifyManager({ type: eventType, payload });
                    }
                }
                else {
                    const company = this.getActiveManagerByUsername(manager.username);
                    if (company) {
                        company.notifyManager({ type: eventType, payload });
                    }
                }
            }
            catch (error) {
                console.error('Failed to notify managers', error);
            }
        });
    }
    getPlatformSessions() {
        return this.platformSessions;
    }
    getPlayerPlatform(username) {
        if (this.platformSessions.has(username)) {
            return this.platformSessions.get(username) || null;
        }
        return null;
    }
    getPlayersSummariesByManager(managerUsername, managerRole) {
        return __awaiter(this, void 0, void 0, function* () {
            const playerSummaries = [];
            let isAllowed = managerRole === 'admin';
            if (managerRole === 'store') {
                const topUser = yield this.getTopUserUntilCompany(managerUsername);
                isAllowed = !!topUser;
            }
            this.platformSessions.forEach((session, playerId) => {
                if (isAllowed || session.managerName === managerUsername) {
                    playerSummaries.push(session.getSummary());
                }
            });
            return playerSummaries;
        });
    }
    getTopUserUntilCompany(username) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = yield userModel_1.User.findOne({ username }).exec();
            if (!user)
                return null;
            while (user.createdBy && user.role !== "supermaster") {
                const parentUser = yield userModel_1.User.findById(user.createdBy).exec();
                if (!parentUser)
                    break;
                user = parentUser;
            }
            return user.role === "supermaster" ? user : null;
        });
    }
    getPlayerCurrentGameSession(username) {
        var _a;
        return (_a = this.getPlayerPlatform(username)) === null || _a === void 0 ? void 0 : _a.currentGameSession;
    }
    addManager(username, manager) {
        if (this.currentActiveManagers.has(username)) {
            console.warn(`Manager with username "${username}" already exists in currentActiveManagers.`);
        }
        else {
            this.currentActiveManagers.set(username, manager);
            console.log(`Manager with username "${username}" has been added to currentActiveManagers.`);
        }
    }
    getActiveManagers() {
        return this.currentActiveManagers;
    }
    getActiveManagerByUsername(username) {
        if (this.currentActiveManagers.has(username)) {
            return this.currentActiveManagers.get(username) || null;
        }
        return null;
    }
    getActiveManagerByRole(role) {
        for (const manager of this.currentActiveManagers.values()) {
            if (manager.role === role) {
                return manager;
            }
        }
        return null;
    }
    deleteManagerByUsername(username) {
        if (this.currentActiveManagers.has(username)) {
            this.currentActiveManagers.delete(username);
            console.log(`Manager with username "${username}" has been removed from currentActiveManagers.`);
        }
        else {
            console.warn(`Manager with username "${username}" not found in currentActiveManagers.`);
        }
    }
}
exports.sessionManager = new SessionManager();
