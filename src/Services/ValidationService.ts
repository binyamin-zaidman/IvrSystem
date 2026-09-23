import { supabase } from "../Config/Supabase";
import { ValidationResult } from "../Models/Validation";

export class ValidationService {
  /**
   * בדיקת תקינות קוד אישור
   */
  static isConfirmationCodeValid(confirmationCode: string): boolean {
    // אם אתה רוצה 5 ספרות בלבד:
    // return /^[0-9]{5}$/.test(confirmationCode);
    
    // או אם אתה רוצה לתמוך גם בפורמט CONF_XXXXX:
    return /^(CONF_\d+|\d{5})$/.test(confirmationCode);
  }

  /**
   * בדיקת נסיעה לפי קוד אישור
   */
static async validateRideByConfirmation(confirmationCode: string): Promise<ValidationResult> {
  try {
    console.log(`=== VALIDATION DEBUG ===`);
    console.log(`Input confirmation code: "${confirmationCode}"`);
    
    // בדיקת פורמט
    const codeFormatValid = this.isConfirmationCodeValid(confirmationCode);
    console.log(`Code format valid: ${codeFormatValid}`);
    
    if (!codeFormatValid) {
      return {
        isValid: false,
        message: 'פורמט קוד האישור שגוי',
        validationDetails: {
          confirmationCodeValid: false,
          rideExists: false,
          rideActive: false,
          timeValid: false
        }
      };
    }

    // חיפוש בדאטהבייס
    console.log(`Searching for ride with confirmation_code: "${confirmationCode}"`);
    const { data: rides, error } = await supabase
      .from("rides")
      .select("*")
      .eq("confirmation_code", confirmationCode);

    console.log(`Database query result:`, { rides, error });
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!rides || rides.length === 0) {
      console.log('No ride found');
      return {
        isValid: false,
        message: 'נסיעה לא נמצאה עם קוד האישור הזה',
        validationDetails: {
          confirmationCodeValid: true,
          rideExists: false,
          rideActive: false,
          timeValid: false
        }
      };
    }

    const ride = rides[0];
    console.log(`Found ride:`, ride);
    
    // המשך הבדיקות...
    const timeValidation = this.validateRideTime(ride);
    console.log(`Time validation:`, timeValidation);
    
    return {
      isValid: timeValidation.isValid,
      ride: ride,
      message: timeValidation.message,
      validationDetails: {
        confirmationCodeValid: true,
        rideExists: true,
        rideActive: true,
        timeValid: timeValidation.isValid
      }
    };

  } catch (error) {
    console.error('Error in validateRideByConfirmation:', error);
    throw error;
  }
}

  /**
   * בדיקת תקינות זמנית של הנסיעה
   */
  private static validateRideTime(ride: any): { isValid: boolean; message: string } {
    const now = new Date();
    const startTime = new Date(ride.start_time);
    const expiresAt = new Date(ride.expires_at);

    // נסיעה לא התחילה עדיין
    if (startTime > now) {
      const minutesUntilStart = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60));
      return {
        isValid: false,
        message: `הנסיעה תחל בעוד ${minutesUntilStart} דקות`
      };
    }

    // נסיעה פגה
    if (expiresAt < now) {
      return {
        isValid: false,
        message: 'הנסיעה פגה'
      };
    }

    // נסיעה בתוקף
    const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
    return {
      isValid: true,
      message: `נסיעה תקפה - נותרו ${minutesLeft} דקות`
    };
  }

  /**
   * בדיקת סטטוס הנסיעה
   */
  private static validateRideStatus(ride: any): { isValid: boolean; message: string } {
    // אם יש end_time, הנסיעה הסתיימה
    if (ride.end_time) {
      return {
        isValid: false,
        message: 'הנסיעה כבר הסתיימה'
      };
    }

    // בדיקות נוספות לפי הצורך
    if (ride.amount === 0) {
      return {
        isValid: true,
        message: 'נסיעה פעילה - טרם שולם'
      };
    }

    return {
      isValid: true,
      message: 'נסיעה פעילה ומשולמת'
    };
  }

  /**
   * אישור נסיעה על ידי מבקר
   */
  static async confirmRideValidation(
    rideId: string,
    inspectorId: string,
    validationStatus: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("ride_validations")
        .insert({
          ride_id: rideId,
          inspector_id: inspectorId,
          validation_status: validationStatus,
          validation_time: new Date(),
          notes: notes
        });

      if (error) {
        throw new Error(`Error recording validation: ${error.message}`);
      }

      console.log(`Ride ${rideId} validated by inspector ${inspectorId}: ${validationStatus}`);

    } catch (error) {
      console.error('Error in confirmRideValidation:', error);
      throw error;
    }
  }

  /**
   * קבלת היסטוריית בדיקות למבקר
   */
  static async getInspectorValidations(
    inspectorId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data: validations, error } = await supabase
        .from("ride_validations")
        .select(`
          *,
          rides!inner(
            confirmation_code,
            start_time,
            amount,
            line_number
          )
        `)
        .eq("inspector_id", inspectorId)
        .order("validation_time", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Error fetching validations: ${error.message}`);
      }

      return validations || [];

    } catch (error) {
      console.error('Error in getInspectorValidations:', error);
      throw error;
    }
  }

  /**
   * סטטיסטיקות בדיקות למבקר
   */
  static async getValidationStats(inspectorId: string, days: number = 7): Promise<any> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data: stats, error } = await supabase
        .from("ride_validations")
        .select("validation_status")
        .eq("inspector_id", inspectorId)
        .gte("validation_time", fromDate.toISOString());

      if (error) {
        throw new Error(`Error fetching stats: ${error.message}`);
      }

      const approved = stats?.filter(s => s.validation_status === 'approved').length || 0;
      const rejected = stats?.filter(s => s.validation_status === 'rejected').length || 0;
      const total = approved + rejected;

      return {
        total,
        approved,
        rejected,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        period: `${days} days`
      };

    } catch (error) {
      console.error('Error in getValidationStats:', error);
      throw error;
    }
  }
}