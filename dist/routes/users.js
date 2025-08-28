"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usersController_js_1 = require("../controllers/usersController.js");
const router = (0, express_1.Router)();
router.post("/register", usersController_js_1.registerUser);
router.post("/login", usersController_js_1.loginUser);
exports.default = router;
