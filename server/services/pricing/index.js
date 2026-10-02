// Pricing Microservice: Dynamic Festive Offers, Garba Rush Fee, Express Delivery
export class PricingService {
  constructor() {
    this.surgeMultiplier = 1.0; // 1.0 = normal, 1.25 = peak Navratri rush / evening rush
    this.freeDeliveryThreshold = 999;
    this.baseDeliveryFee = 60;
    this.handlingFee = 15; // garment inspection & steam pressing fee
    this.activePromos = [
      { code: "GARBA500", discountFlat: 500, minOrder: 2999 },
      { code: "NAVRATRI20", discountPercent: 20, maxDiscount: 600, minOrder: 999 },
      { code: "TWIRLFREE", freeDelivery: true, minOrder: 499 }
    ];
  }

  setSurgeMultiplier(val) {
    this.surgeMultiplier = Number(val);
    return this.surgeMultiplier;
  }

  getPricingRules() {
    return {
      surgeMultiplier: this.surgeMultiplier,
      freeDeliveryThreshold: this.freeDeliveryThreshold,
      baseDeliveryFee: this.baseDeliveryFee,
      handlingFee: this.handlingFee,
      activePromos: this.activePromos
    };
  }

  calculateOrderTotal({ items, promoCode = "", distanceKm = 2.5 }) {
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Delivery fee
    let deliveryFee = subtotal >= this.freeDeliveryThreshold ? 0 : this.baseDeliveryFee;
    
    // Festive Rush Surge fee
    let surgeFee = 0;
    if (this.surgeMultiplier > 1.0) {
      surgeFee = Math.round(35 * (this.surgeMultiplier - 1.0));
    }

    // Promo Code Application
    let discount = 0;
    let promoApplied = null;

    if (promoCode) {
      const promo = this.activePromos.find(p => p.code.toUpperCase() === promoCode.toUpperCase());
      if (promo && subtotal >= promo.minOrder) {
        if (promo.freeDelivery) {
          deliveryFee = 0;
          promoApplied = promo.code;
        } else if (promo.discountFlat) {
          discount = Math.min(subtotal, promo.discountFlat);
          promoApplied = promo.code;
        } else if (promo.discountPercent) {
          discount = Math.min(promo.maxDiscount, Math.round((subtotal * promo.discountPercent) / 100));
          promoApplied = promo.code;
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee + surgeFee + this.handlingFee - discount);

    return {
      subtotal,
      deliveryFee,
      surgeFee,
      handlingFee: this.handlingFee,
      discount,
      promoApplied,
      total,
      breakdown: {
        isFreeDeliveryEligible: subtotal >= this.freeDeliveryThreshold,
        amountNeededForFreeDelivery: Math.max(0, this.freeDeliveryThreshold - subtotal)
      }
    };
  }
}

export const pricingService = new PricingService();
