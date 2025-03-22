"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.default = getRTP;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const XLSX = __importStar(require("xlsx"));
function getRTP(spins, currentData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let spend = 0;
            let won = 0;
            currentData.playerData.rtpSpinCount = spins;
            for (let i = 0; i < currentData.playerData.rtpSpinCount; i++) {
                yield currentData.spinResult();
                spend = currentData.playerData.totalbet;
                won = currentData.playerData.haveWon;
                console.log(`Spin ${i + 1} completed. ${currentData.playerData.totalbet} , ${won}`);
            }
            let rtp = 0;
            if (spend > 0) {
                rtp = won / spend;
            }
            console.log('RTP calculated:', currentData.currentGameData.gameId, spins, rtp * 100 + '%');
            const now = new Date();
            // Store the data in an Excel file
            const date = now.toISOString().split('T')[0];
            const filePath = path.resolve(__dirname, '../../../../..', `simulator${date}.xlsx`);
            const newData = {
                username: currentData.currentGameData.username,
                gameId: currentData.currentGameData.gameId,
                spins,
                rtp: rtp * 100,
                date: new Date().toISOString()
            };
            let workbook;
            if (fs.existsSync(filePath)) {
                workbook = XLSX.readFile(filePath);
            }
            else {
                workbook = XLSX.utils.book_new();
            }
            let worksheet = workbook.Sheets['RTP Data'];
            if (!worksheet) {
                worksheet = XLSX.utils.json_to_sheet([]);
                XLSX.utils.book_append_sheet(workbook, worksheet, 'RTP Data');
            }
            const existingData = XLSX.utils.sheet_to_json(worksheet);
            existingData.push(newData);
            const updatedWorksheet = XLSX.utils.json_to_sheet(existingData);
            workbook.Sheets['RTP Data'] = updatedWorksheet;
            XLSX.writeFile(workbook, filePath);
            // Restart the server using pm2
            (0, child_process_1.exec)('pm2 restart my-server', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error restarting server: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        }
        catch (error) {
            console.error("Failed to calculate RTP:", error);
            currentData.sendError("RTP calculation error");
        }
    });
}
