import { Request, Response } from "express";
import { ValidationService } from "../Services/ValidationService";
import { TripService } from "../Services/TripService";
import { IVRService } from "../Services/try";

export class ValidationController {
  /**
   * 🎯 אימות נסיעה לפי קוד אישור
   * POST /api/validation/verify
   * Body: { confirmationCode: string }
   */
  static async verifyRide(req: Request, res: Response) {
    try {
      const { confirmationCode } = req.body;

      if (!confirmationCode) {
        return res.status(400).json({ 
          success: false,
          message: "קוד אישור חסר" 
        });
      }

      console.log(`🔍 Verifying ride with code: ${confirmationCode}`);

      const result = await ValidationService.validateRideByConfirmation(
        confirmationCode
      );

      if (result.isValid) {
        return res.json({
          success: true,
          message: result.message,
          ride: {
            line_number: result.ride.line_number,
            bus_code: result.ride.bus_code,
            start_stop_id: result.ride.start_stop_id,
            end_stop_id: result.ride.end_stop_id,
            amount: result.ride.amount,
            start_time: result.ride.start_time,
            expires_at: result.ride.expires_at
          },
          validationDetails: result.validationDetails
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
          validationDetails: result.validationDetails
        });
      }
    } catch (error: any) {
      console.error("❌ Error in verifyRide:", error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה באימות הנסיעה" 
      });
    }
  }

  /**
   * 🎯 קבלת נסיעה פעילה לפי מספר טלפון
   * GET /api/validation/active/:phone
   */
  static async getActiveRideByPhone(req: Request, res: Response) {
    try {
      const { phone } = req.params;

      if (!phone) {
        return res.status(400).json({ 
          success: false,
          message: "מספר טלפון חסר" 
        });
      }

      console.log(`📱 Getting active ride for phone: ${phone}`);

      const ride = await IVRService.handleGetUserConfirmation(phone);

      if (!ride) {
        return res.status(404).json({
          success: false,
          message: "לא נמצאה נסיעה פעילה"
        });
      }

      res.json({
        success: true,
        ride: {
          confirmation_code: ride.confirmation_code,
          line_number: ride.line_number,
          bus_code: ride.bus_code,
          amount: ride.amount,
          start_time: ride.start_time,
          expires_at: ride.expires_at,
          start_stop_id: ride.start_stop_id,
          end_stop_id: ride.end_stop_id
        }
      });
    } catch (error: any) {
      console.error("❌ Error in getActiveRideByPhone:", error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה בשליפת הנסיעה" 
      });
    }
  }

  /**
   * 🎯 רישום אימות על ידי מבקר
   * POST /api/validation/confirm
   * Body: { rideId: string, inspectorId: string, status: 'approved'|'rejected', notes?: string }
   */
  static async confirmValidation(req: Request, res: Response) {
    try {
      const { rideId, inspectorId, status, notes } = req.body;

      if (!rideId || !inspectorId || !status) {
        return res.status(400).json({ 
          success: false,
          message: "נתונים חסרים" 
        });
      }

      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ 
          success: false,
          message: "סטטוס לא תקין" 
        });
      }

      await ValidationService.confirmRideValidation(
        rideId,
        inspectorId,
        status,
        notes
      );

      res.json({
        success: true,
        message: `נסיעה ${status === 'approved' ? 'אושרה' : 'נדחתה'} בהצלחה`
      });
    } catch (error: any) {
      console.error("❌ Error in confirmValidation:", error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה ברישום האימות" 
      });
    }
  }

  /**
   * 🎯 היסטוריית אימותים של מבקר
   * GET /api/validation/inspector/:inspectorId/history
   */
  static async getInspectorHistory(req: Request, res: Response) {
    try {
      const { inspectorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!inspectorId) {
        return res.status(400).json({ 
          success: false,
          message: "מזהה מבקר חסר" 
        });
      }

      const validations = await ValidationService.getInspectorValidations(
        inspectorId,
        limit
      );

      res.json({
        success: true,
        count: validations.length,
        validations
      });
    } catch (error: any) {
      console.error("❌ Error in getInspectorHistory:", error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה בשליפת ההיסטוריה" 
      });
    }
  }

  /**
   * 🎯 סטטיסטיקות של מבקר
   * GET /api/validation/inspector/:inspectorId/stats
   */
  static async getInspectorStats(req: Request, res: Response) {
    try {
      const { inspectorId } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      if (!inspectorId) {
        return res.status(400).json({ 
          success: false,
          message: "מזהה מבקר חסר" 
        });
      }

      const stats = await ValidationService.getValidationStats(
        inspectorId,
        days
      );

      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      console.error("❌ Error in getInspectorStats:", error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה בשליפת הסטטיסטיקות" 
      });
    }
  }
}