"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = exports.users = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// יצוא המשתמשים כדי שרכיבים אחרים (ridesController) יוכלו לגשת
exports.users = [];
const registerUser = (req, res) => {
    const { phoneNumber, name, password } = req.body;
    if (!phoneNumber || !password) {
        return res.status(400).json({ message: "phoneNumber and password required" });
    }
    const exists = exports.users.find(u => u.phoneNumber === phoneNumber);
    if (exists) {
        return res.status(400).json({ message: "User already exists" });
    }
    const passwordHash = bcrypt_1.default.hashSync(password, 10);
    exports.users.push({ phoneNumber, name, passwordHash, rides: [] });
    return res.json({ message: "User registered successfully" });
};
exports.registerUser = registerUser;
const loginUser = (req, res) => {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
        return res.status(400).json({ message: "phoneNumber and password required" });
    }
    const user = exports.users.find(u => u.phoneNumber === phoneNumber);
    if (!user)
        return res.status(400).json({ message: "User not found" });
    const ok = bcrypt_1.default.compareSync(password, user.passwordHash);
    if (!ok)
        return res.status(400).json({ message: "Invalid password" });
    const secret = process.env.JWT_SECRET ?? "dev-secret";
    const token = jsonwebtoken_1.default.sign({ phoneNumber }, secret, { expiresIn: "1h" });
    return res.json({ token });
};
exports.loginUser = loginUser;
