export function generateConfirmationCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 ספרות
}

export function isConfirmationCodeValid(confirmationCode: string): boolean {
  return /^[0-9]{5}$/.test(confirmationCode); // 5 ספרות
}