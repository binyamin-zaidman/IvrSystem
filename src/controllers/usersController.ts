import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";

export async function registerUser(req: Request, res: Response) {
  const { phoneNumber, name, password, email } = req.body as {
    phoneNumber?: string;
    name?: string;
    password?: string;
    email?: string;
  };
  if (!phoneNumber || !password)
    return res
      .status(400)
      .json({ message: "phoneNumber and password required" });

  const hash = bcrypt.hashSync(password, 10);

  try {
    const insert = await pool.query(
      `INSERT INTO users (phone_number, name, password_hash,email)
       VALUES ($1,$2,$3,$4)
       RETURNING id, phone_number AS "phoneNumber", name, created_at AS "createdAt", email`,
      [phoneNumber, name ?? null, hash, email ?? null]
    );
    return res.json({ user: insert.rows[0] });
  } catch (err: any) {
    if (String(err?.message).includes("unique")) {
      return res.status(409).json({ message: "User already exists" });
    }
    console.error(err);
    return res.status(500).json({ message: "DB error" });
  }
}

export async function loginUser(req: Request, res: Response) {
  const { phoneNumber, password } = req.body as {
    phoneNumber?: string;
    password?: string;
  };
  if (!phoneNumber || !password)
    return res
      .status(400)
      .json({ message: "phoneNumber and password required" });

  const q = await pool.query(
    `SELECT id, phone_number, password_hash FROM users WHERE phone_number=$1`,
    [phoneNumber]
  );
  const user = q.rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { sub: user.id, phoneNumber },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  return res.json({ token });
}
