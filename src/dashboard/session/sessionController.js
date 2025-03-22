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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sessionModel_1 = require("./sessionModel");
const http_errors_1 = __importDefault(require("http-errors"));
class SessionController {
    playerSessionHandler(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { startDate, endDate, playerId, page = 1, limit = 10 } = req.query;
                if (!playerId) {
                    throw (0, http_errors_1.default)(400, "Player ID query parameter is required");
                }
                let query = { playerId: playerId };
                let parsedStartDate, parsedEndDate;
                // Add date range to the query if provided
                if (startDate || endDate) {
                    if (startDate) {
                        parsedStartDate = new Date(startDate);
                        if (isNaN(parsedStartDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid startDate format");
                        }
                        query["entryTime"] = Object.assign(Object.assign({}, query["entryTime"]), { $gte: parsedStartDate });
                    }
                    if (endDate) {
                        parsedEndDate = new Date(endDate);
                        if (isNaN(parsedEndDate.getTime())) {
                            throw (0, http_errors_1.default)(400, "Invalid endDate format");
                        }
                        query["entryTime"] = Object.assign(Object.assign({}, query["entryTime"]), { $lte: parsedEndDate });
                    }
                    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
                        throw (0, http_errors_1.default)(400, "startDate cannot be after endDate");
                    }
                }
                // Get total sessions count
                const totalSessions = yield sessionModel_1.PlatformSessionModel.countDocuments(query);
                if (totalSessions === 0) {
                    throw (0, http_errors_1.default)(404, "No session data found for this player within the given criteria");
                }
                // Calculate total pages
                const totalPages = Math.ceil(totalSessions / Number(limit));
                if (Number(page) > totalPages) {
                    throw (0, http_errors_1.default)(404, "Number of page exceeds total pages");
                }
                // Fetch paginated data
                const platformSessions = yield sessionModel_1.PlatformSessionModel.find(query)
                    .sort({ entryTime: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit))
                    .lean();
                // Fetch full data for Excel if needed
                const platformSessionsForExcel = yield sessionModel_1.PlatformSessionModel.find(query);
                // Respond with paginated data and metadata
                return res.status(200).json({
                    sessionData: platformSessions,
                    excelData: platformSessionsForExcel,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: totalPages,
                        totalSessions: totalSessions,
                    },
                });
            }
            catch (error) {
                console.error("Error retrieving player session data:", error);
                next(error);
            }
        });
    }
}
exports.default = new SessionController();
