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
exports.incrementDownload = exports.incrementInstall = void 0;
const appService_1 = require("./appService");
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
