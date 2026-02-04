import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';
import { Platform } from 'react-native';

export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  pricePerMonth?: string;
  savings?: string;
  package: PurchasesPackage;
}

export class PurchaseService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure RevenueCat
      // Replace with your actual API keys
      const apiKey = Platform.select({
        ios: 'appl_YOUR_IOS_API_KEY',
        android: 'goog_YOUR_ANDROID_API_KEY',
      });

      if (apiKey) {
        Purchases.configure({ apiKey });
        this.isInitialized = true;
        console.log('RevenueCat initialized');
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  static async getOfferings(): Promise<SubscriptionPlan[]> {
    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        return [];
      }

      const plans: SubscriptionPlan[] = [];

      // Monthly plan
      const monthly = offerings.current.monthly;
      if (monthly) {
        plans.push({
          id: 'monthly',
          title: 'Monthly',
          description: 'Billed monthly',
          price: monthly.product.priceString,
          package: monthly,
        });
      }

      // Annual plan
      const annual = offerings.current.annual;
      if (annual) {
        const monthlyPrice = annual.product.price / 12;
        const savings = monthly
          ? Math.round(
              ((monthly.product.price - monthlyPrice) / monthly.product.price) *
                100,
            )
          : 33;

        plans.push({
          id: 'annual',
          title: 'Annual',
          description: 'Billed annually',
          price: annual.product.priceString,
          pricePerMonth: `$${monthlyPrice.toFixed(2)}/month`,
          savings: `Save ${savings}%`,
          package: annual,
        });
      }

      // Lifetime plan
      const lifetime = offerings.current.lifetime;
      if (lifetime) {
        plans.push({
          id: 'lifetime',
          title: 'Lifetime',
          description: 'One-time purchase',
          price: lifetime.product.priceString,
          package: lifetime,
        });
      }

      return plans;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return [];
    }
  }

  static async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        throw new Error('Purchase cancelled');
      }
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      throw error;
    }
  }

  static async isPremium(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return (
        customerInfo.entitlements.active.premium !== undefined ||
        customerInfo.entitlements.active.pro !== undefined
      );
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  static async hasFeature(featureId: string): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.entitlements.active[featureId] !== undefined;
    } catch (error) {
      console.error('Failed to check feature:', error);
      return false;
    }
  }
}
