import { z } from "zod";


/** Hebrew or English letters, digits, `_` and `.` — no spaces. */
const USERNAME_PATTERN = /^[a-zA-Zא-ת0-9_.]+$/;

export const registerSchema = z.object({
  firstName: z.string('First name must be a string').trim().max(20),
  lastName: z.string('Last name must be a string').trim().max(20),
  phone: z.string().min(10),
  password: z.string().min(12),
});

export const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().trim().min(12),
});