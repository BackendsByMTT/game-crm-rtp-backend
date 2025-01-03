import { PlatformSessionModel } from "./sessionModel";
import createHttpError from "http-errors";
import { NextFunction, Request, Response } from "express";

class SessionController {

    async playerSessionHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, playerId, page = 1, limit = 10 } = req.query;

            if (!playerId) {
                throw createHttpError(400, "Player ID query parameter is required");
            }

            let query = { playerId: playerId };
            let parsedStartDate, parsedEndDate;

            // Add date range to the query if provided
            if (startDate || endDate) {
                if (startDate) {
                    parsedStartDate = new Date(startDate as string);
                    if (isNaN(parsedStartDate.getTime())) {
                        throw createHttpError(400, "Invalid startDate format");
                    }
                    query["entryTime"] = { ...query["entryTime"], $gte: parsedStartDate };
                }

                if (endDate) {
                    parsedEndDate = new Date(endDate as string);
                    if (isNaN(parsedEndDate.getTime())) {
                        throw createHttpError(400, "Invalid endDate format");
                    }
                    query["entryTime"] = { ...query["entryTime"], $lte: parsedEndDate };
                }

                if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
                    throw createHttpError(400, "startDate cannot be after endDate");
                }
            }

            // Get total sessions count
            const totalSessions = await PlatformSessionModel.countDocuments(query);

            if (totalSessions === 0) {
                throw createHttpError(404, "No session data found for this player within the given criteria");
            }

            // Calculate total pages
            const totalPages = Math.ceil(totalSessions / Number(limit));
            if (Number(page) > totalPages) {
                throw createHttpError(404, "Number of page exceeds total pages");
            }

            // Fetch paginated data
            const platformSessions = await PlatformSessionModel.find(query)
                .sort({ entryTime: -1 })
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit))
                .lean();

            // Fetch full data for Excel if needed
            const platformSessionsForExcel = await PlatformSessionModel.find(query);

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
        } catch (error) {
            console.error("Error retrieving player session data:", error);
            next(error);
        }
    }

}

export default new SessionController();