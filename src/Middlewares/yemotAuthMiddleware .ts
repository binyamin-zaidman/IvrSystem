import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Secret key שתגדיר בימות המשיח (api_add_0=signature=...)
// Fail-fast on missing config so we never run with a known/default signing secret.
if (!process.env.YEMOT_SECRET_KEY) {
  throw new Error(
    "YEMOT_SECRET_KEY is not set — refusing to start without a configured signing secret"
  );
}
const SECRET_KEY: string = process.env.YEMOT_SECRET_KEY;

// DID מורשים (המספרים של המערכת שלך)
// Fail-fast rather than accepting a hardcoded DID — prevents accidental open-system deploys.
if (!process.env.YEMOT_ALLOWED_DIDS) {
  throw new Error(
    "YEMOT_ALLOWED_DIDS is not set — refusing to start without an explicit DID allowlist"
  );
}
const ALLOWED_DIDS: string[] = process.env.YEMOT_ALLOWED_DIDS.split(",")
  .map((d) => d.trim())
  .filter(Boolean);
if (ALLOWED_DIDS.length === 0) {
  throw new Error(
    "YEMOT_ALLOWED_DIDS is empty after parsing — refusing to start with no allowed DIDs"
  );
}

export const yemotAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("🔐 Yemot Authentication Check");
  
    // ✅ שכבה 1: בדיקת User-Agent
    const userAgent = req.headers["user-agent"];
    if (!userAgent || !userAgent.includes("yemot-core-api")) {
      console.warn("❌ Invalid User-Agent:", userAgent);
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid request source"
      });
    }
    console.log("✅ Valid User-Agent");

    // ✅ שכבה 2: בדיקת שדות חובה
    const { ApiCallId, ApiPhone, ApiDID, ApiTime } = req.body;

    if (!ApiCallId || !ApiPhone || !ApiDID || !ApiTime) {
      console.warn("❌ Missing required fields");
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields"
      });
    }

    // ✅ שכבה 3: בדיקת DID (המספר של המערכת שלך)
    if (!ALLOWED_DIDS.includes(ApiDID)) {
      console.warn(`❌ Unauthorized DID: ${ApiDID}`);
      return res.status(403).json({
        error: "Forbidden",
        message: "Unauthorized system number"
      });
    }
    console.log("✅ Valid DID");

    // ✅ שכבה 4: בדיקת Timestamp (למנוע replay attacks)
    if (!isTimestampValid(ApiTime)) {
      console.warn(`❌ Invalid or expired timestamp: ${ApiTime}`);
      return res.status(403).json({
        error: "Forbidden",
        message: "Request expired"
      });
    }
    console.log("✅ Valid timestamp");

    // ✅ שכבה 5: בדיקת חתימה דיגיטלית (חובה)
    // Without a mandatory signature, ApiPhone is attacker-controlled and every
    // downstream identity check (ride creation, session lookup) is spoofable.
    const signature = req.body.signature || req.query.signature;

    if (!signature || typeof signature !== "string") {
      console.warn("❌ Missing signature");
      return res.status(403).json({
        error: "Forbidden",
        message: "Missing request signature"
      });
    }

    const expectedSignature = generateSignature({
      ApiCallId,
      ApiPhone,
      ApiDID,
      ApiTime
    });

    // Timing-safe comparison to avoid leaking the expected signature byte-by-byte.
    let signaturesMatch = false;
    try {
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expectedSignature, "hex");
      signaturesMatch =
        sigBuf.length === expBuf.length &&
        sigBuf.length > 0 &&
        crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      console.warn("❌ Invalid signature");
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid signature"
      });
    }
    console.log("✅ Valid signature");


    // ✅ שכבה 7: Rate limiting
    if (!checkRateLimit(ApiPhone)) {
      console.warn(`❌ Rate limit exceeded for: ${ApiPhone}`);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Please try again later"
      });
    }
    console.log("✅ Rate limit OK");

    // ✅ כל הבדיקות עברו
    console.log(`✅ Authentication successful for ${ApiPhone}`);
    
    // הוספת מידע למשתמש ב-request (לשימוש בקונטרולרים)
    req.yemotUser = {
      phone: ApiPhone,
      callId: ApiCallId,
      did: ApiDID,
      extension: req.body.ApiExtension,
      time: new Date(parseInt(ApiTime) * 1000)
    };

    next();

  } catch (error) {
    console.error("❌ Authentication error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed"
    });
  }
};

// ============ פונקציות עזר ============

/**
 * יצירת חתימה דיגיטלית
 * זה מה שתגדיר בימות המשיח:
 * api_add_0=signature=[הערך שהפונקציה הזו מחזירה]
 */
function generateSignature(data: {
  ApiCallId: string;
  ApiPhone: string;
  ApiDID: string;
  ApiTime: string;
}): string {
  // יצירת מחרוזת מסודרת
  const payload = `${data.ApiCallId}:${data.ApiPhone}:${data.ApiDID}:${data.ApiTime}`;
  
  // יצירת HMAC SHA256
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");
}

/**
 * בדיקת תקינות Timestamp
 * מקבל בקשות עד 5 דקות ישנות, עם חלון גרייס קצר של 60 שניות לעתיד.
 * Rejects arbitrarily-future timestamps — prior Math.abs check allowed both
 * directions, which widens the replay window for any captured future-dated request.
 */
function isTimestampValid(timestamp: string): boolean {
  try {
    const parsed = parseInt(timestamp, 10);
    if (!Number.isFinite(parsed)) return false;
    const requestTimeMs = parsed * 1000;
    const now = Date.now();
    const ageMs = now - requestTimeMs; // positive = past, negative = future

    const MAX_AGE_MS = 5 * 60 * 1000;
    const MAX_FUTURE_SKEW_MS = 60 * 1000;

    return ageMs >= -MAX_FUTURE_SKEW_MS && ageMs <= MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Rate Limiting - מגביל מספר בקשות לדקה
 * 🔒 זה מונע abuse - כל משתמש מוגבל ל-20 בקשות לדקה
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(phone);

  const MAX_REQUESTS = 20; // מקסימום בקשות
  const WINDOW = 60 * 1000; // חלון זמן (דקה)

  if (!limit || now > limit.resetTime) {
    // יצירת רשומה חדשה
    rateLimitMap.set(phone, { 
      count: 1, 
      resetTime: now + WINDOW 
    });
    return true;
  }

  if (limit.count >= MAX_REQUESTS) {
    // עבר את המקסימום
    return false;
  }

  // עדיין בתוך הגבול
  limit.count++;
  return true;
}

// ניקוי rate limit map כל 5 דקות (למנוע memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [phone, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// ============ Types ============
declare global {
  namespace Express {
    interface Request {
      yemotUser?: {
        phone: string;
        callId: string;
        did: string;
        extension?: string;
        time: Date;
      };
    }
  }
}