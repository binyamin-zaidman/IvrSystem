import { Router } from "express";
import { registerUser, loginUser } from "../Controllers/usersController";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
