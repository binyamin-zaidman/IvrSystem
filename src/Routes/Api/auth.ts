import { Router } from "express";
import { register, login, logout } from "../../Controllers/AuthController";
import { registerSchema, loginSchema } from "../../Validator/userValidator";
import { validateBody } from "../../Middlewares/ValidateBody";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", logout);

export default router;
