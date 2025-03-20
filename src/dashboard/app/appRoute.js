"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appController_1 = require("./appController");
const router = (0, express_1.Router)();
router.post('/install', appController_1.incrementInstall);
router.post('/download', appController_1.incrementDownload);
exports.default = router;
