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
exports.setBackground = exports.getAppMetrics = exports.incrementDownload = exports.incrementInstall = void 0;
const appService_1 = require("./appService");
const sessionManager_1 = require("../session/sessionManager");
const incrementInstall = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield (0, appService_1.incrementInstallCount)();
        res.status(200).json(app);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.incrementInstall = incrementInstall;
const incrementDownload = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield (0, appService_1.incrementDownloadCount)();
        res.status(200).json(app);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.incrementDownload = incrementDownload;
// export const getDownload = async (req: Request, res: Response) => {
//   try {
//     const count = await getDownloadCount()
//     res.status(200).json(count);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }
//
// export const getInstall = async (req: Request, res: Response) => {
//   try {
//     const count = await getInstallCount();
//     res.status(200).json(count);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }
const getAppMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const counts = yield (0, appService_1.getAllCounts)();
        console.log("count", counts);
        res.status(200).json(counts);
    }
    catch (e) {
        console.log("error", e);
        res.status(500).json({ error: e.message });
    }
});
exports.getAppMetrics = getAppMetrics;
const setBackground = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // console.log("req", req);
        if (!req.body || typeof req.body.isBack !== 'boolean') {
            return res.status(400).json({ error: "background boolean is required" });
        }
        //NOTE: emit socket msg - "reactNat","isBack:true | false"
        const _req = req;
        const { username } = _req.user;
        const player = sessionManager_1.sessionManager.getPlaygroundUser(username);
        const background = req.body.isBack;
        player.currentGameData.sendMessage("appBackground", background, true);
        res.status(200).json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.setBackground = setBackground;
