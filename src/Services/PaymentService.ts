export class PaymentService {
  static async makePayment() {
    // TODO: implement payment
  }

  static async getUserPayments() {
    // TODO: implement payment list
  }
   private static calculateDistance(
    coord1: { lat: number; lon: number },
    coord2: { lat: number; lon: number }
  ): number {
    const R = 6371; // רדיוס כדור הארץ בקילומטרים
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lon - coord1.lon);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
