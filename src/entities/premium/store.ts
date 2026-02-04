import { create } from 'zustand';
import { PurchaseService } from '../../processes/iap/PurchaseService';

interface PremiumStore {
  isPremium: boolean;
  isLoading: boolean;
  checkPremiumStatus: () => Promise<void>;
  setPremium: (isPremium: boolean) => void;
  hasFeature: (featureId: string) => Promise<boolean>;
}

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: false,
  isLoading: false,

  checkPremiumStatus: async () => {
    try {
      set({ isLoading: true });
      const isPremium = await PurchaseService.isPremium();
      set({ isPremium, isLoading: false });
    } catch (error) {
      console.error('Failed to check premium status:', error);
      set({ isLoading: false });
    }
  },

  setPremium: (isPremium: boolean) => {
    set({ isPremium });
  },

  hasFeature: async (featureId: string) => {
    const { isPremium } = get();
    if (isPremium) return true;

    try {
      return await PurchaseService.hasFeature(featureId);
    } catch (error) {
      console.error('Failed to check feature:', error);
      return false;
    }
  },
}));
