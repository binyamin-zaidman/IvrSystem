export interface ValidationResult {
  isValid: boolean;
  ride?: any;
  message: string;
  validationDetails: {
    confirmationCodeValid: boolean;
    rideExists: boolean;
    rideActive: boolean;
    timeValid: boolean;
  };
}
