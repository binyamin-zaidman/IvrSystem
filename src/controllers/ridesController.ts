import { Request, Response } from 'express';
import { pool } from '../config/db';
import { generateConfirmationCode } from '../utils/confirm';

export async function startRide(req: Request, res: Response) {
  const { phoneNumber, lineNumber, busCode, fromStopId, directionId } = req.body as {
    phoneNumber?: string; lineNumber?: string | number; busCode?: string;
    fromStopId?: string; directionId?: number;
  };
  if (!phoneNumber || !lineNumber) {
    return res.status(400).json({ message: 'phoneNumber and lineNumber required' });
  }

  const u = await pool.query(`SELECT id FROM users WHERE phone_number=$1`, [phoneNumber]);
  const user = u.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });

  const code = generateConfirmationCode();
  const expiresMins = 20;

  const ins = await pool.query(
    `INSERT INTO rides (user_id, line_number, confirmation_code, bus_code, from_stop_id, direction_id, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6, NOW() + ($7 || ' minutes')::interval)
     RETURNING id, confirmation_code AS "confirmationCode", start_time AS "startTime", expires_at AS "expiresAt"`,
    [user.id, String(lineNumber), code, busCode ?? null, fromStopId ?? null, directionId ?? null, expiresMins]
  );

  return res.json({ confirmationCode: ins.rows[0].confirmationCode, expiresAt: ins.rows[0].expiresAt });
}

export async function getLastConfirmation(req: Request, res: Response) {
  const phone = String(req.params.phone ?? '');
  if (!phone) return res.status(400).json({ message: 'phone required' });

  const u = await pool.query(`SELECT id FROM users WHERE phone_number=$1`, [phone]);
  const user = u.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });

  const r = await pool.query(
    `SELECT confirmation_code AS "confirmationCode"
     FROM rides
     WHERE user_id=$1
     ORDER BY start_time DESC
     LIMIT 1`,
    [user.id]
  );

  if (r.rowCount === 0) return res.status(404).json({ message: 'No rides found' });
  return res.json({ confirmationCode: r.rows[0].confirmationCode });
}

export async function validateCode(req: Request, res: Response) {
  const { lineNumber, confirmationCode, busCode } = req.body as {
    lineNumber?: string | number; confirmationCode?: string; busCode?: string;
  };
  if (!lineNumber || !confirmationCode) {
    return res.status(400).json({ message: 'lineNumber and confirmationCode required' });
  }

  const q = await pool.query(
    `SELECT id, expires_at, validated_at
     FROM rides
     WHERE line_number=$1 AND confirmation_code=$2
       AND (expires_at IS NULL OR expires_at > NOW())
       ${busCode ? 'AND (bus_code IS NULL OR bus_code=$3)' : ''}
     ORDER BY start_time DESC
     LIMIT 1`,
    busCode ? [String(lineNumber), confirmationCode, busCode] : [String(lineNumber), confirmationCode]
  );

  if (q.rowCount === 0) return res.status(404).json({ message: 'Invalid or expired code' });
  const ride = q.rows[0];
  if (ride.validated_at) return res.status(409).json({ message: 'Code already validated' });

  await pool.query(`UPDATE rides SET validated_at=NOW() WHERE id=$1`, [ride.id]);
  return res.json({ valid: true, rideId: ride.id });
}
export async function validRide(req: Request, res: Response) {
  const { lineNumber, confirmationCode } = req.query as { lineNumber?: string; confirmationCode?: string };
  if (!lineNumber || !confirmationCode) return res.status(400).json({ message: 'lineNumber and confirmationCode required' });

  const q = await pool.query(
    `SELECT id,
            (expires_at IS NULL OR expires_at > NOW()) AS not_expired,
            validated_at IS NULL AS not_validated
     FROM rides
     WHERE line_number=$1 AND confirmation_code=$2
     ORDER BY start_time DESC
     LIMIT 1`,
    [lineNumber, confirmationCode]
  );

  if (q.rowCount === 0) return res.json({ valid: false, reason: 'not_found' });

  const r = q.rows[0];
  const valid = r.not_expired && r.not_validated;
  return res.json({ valid, reason: valid ? 'ok' : (!r.not_expired ? 'expired' : 'already_validated') });
}
export async function listUserRides(req: Request, res: Response) {
  const phone = String(req.params.phone ?? '');
  if (!phone) return res.status(400).json({ message: 'phone required' });

  const u = await pool.query(`SELECT id FROM users WHERE phone_number=$1`, [phone]);
  const user = u.rows[0];
  if (!user) return res.status(404).json({ message: 'User not found' });

  const rides = await pool.query(
    `SELECT id, line_number AS "lineNumber",
            start_time AS "startTime", end_time AS "endTime",
            confirmation_code AS "confirmationCode",
            validated_at AS "validatedAt",
            km_traveled AS "km", fare_agorot AS "fareAgorot",
            from_stop_id AS "fromStopId", to_stop_id AS "toStopId"
     FROM rides
     WHERE user_id=$1
     ORDER BY start_time DESC`,
    [user.id]
  );

  return res.json({ rides: rides.rows });
}

