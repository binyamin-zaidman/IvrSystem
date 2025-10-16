import { Request, Response } from "express";

export class IVRController {
  static async webhook(req: Request, res: Response) {
    // לוג של הכל
    console.log("\n" + "=".repeat(60));
    console.log("📞 בקשה חדשה!");
    console.log("זמן:", new Date().toLocaleString("he-IL"));
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Query:", JSON.stringify(req.query, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("=".repeat(60) + "\n");

    // תשובה פשוטה מאוד
    const response = "read_text=test";
    res
      .status(200)
      .set("Content-Type", "text/plain; charset=utf-8")
      .send(response);
  }
}
