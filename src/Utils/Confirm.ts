export function generateConfirmationCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 ספרות
}

export function extractDigits(code?: string): string {
  console.log("Extracting digits from code:", code);
  if (!code) {
    return "00000";
  }
  // אם הקוד הוא CONF_63096 - נחזיר רק 63096
  const match = code.match(/\d+/);
  return match ? match[0] : "00000";
}



export function isConfirmationCodeValid(confirmationCode: string): boolean {
  return /^[0-9]{5}$/.test(confirmationCode); // 5 ספרות
}

