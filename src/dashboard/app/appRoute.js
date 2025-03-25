"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appController_1 = require("./appController");
const checkUser_1 = require("../middleware/checkUser");
const appRoutes = (0, express_1.Router)();
appRoutes.post('/install', appController_1.incrementInstall);
appRoutes.post('/download', appController_1.incrementDownload);
appRoutes.get('/metrics', checkUser_1.checkUser, 
// checkRole(["admin"]),
appController_1.getAppMetrics);
appRoutes.post('/background', checkUser_1.checkUser, appController_1.setBackground);
exports.default = appRoutes;
