"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ridesController_js_1 = require("../controllers/ridesController.js");
const router = (0, express_1.Router)();
router.post("/start", ridesController_js_1.startRide);
router.get("/confirmation/:phone", ridesController_js_1.getLastConfirmation);
exports.default = router;
