import { z } from "zod";


export const registerSchema = z.object({
  firstName: z.string('First name must be a string').trim().min(1).max(20),
  lastName: z.string('Last name must be a string').trim().min(1).max(20),
  phone: z.string().min(10),
  password: z.string().min(12),
});

export const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().trim().min(12),
});