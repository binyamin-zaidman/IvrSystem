import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {supabase} from "../Config/Supabase";
import jwt from "jsonwebtoken";

export async function registerUser(req: Request, res: Response) {
  const { phoneNumber, name, password, email } = req.body as {
    phoneNumber?: string;
    name?: string;
    password?: string;
    email?: string;
  };

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: "phoneNumber and password required" });
  }

  const hash = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({
      phone_number: phoneNumber,
      name,
      password_hash: hash,
      email
    })
    .select("id, phone_number, name, created_at, email")
    .single();

  if (error) {
    if (String(error.message).includes("duplicate key")) {
      return res.status(409).json({ message: "User already exists" });
    }
    console.error(error);
    return res.status(500).json({ message: "DB error" });
  }

  return res.json({ user: data });
}

export async function loginUser(req: Request, res: Response) {
  const { phoneNumber, password } = req.body as {
    phoneNumber?: string;
    password?: string;
  };

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: "phoneNumber and password required" });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, phone_number, password_hash")
    .eq("phone_number", phoneNumber)
    .single();

  if (error || !user) {
    return res.status(404).json({ message: "User not found" });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { sub: user.id, phoneNumber },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  return res.json({ token });
}