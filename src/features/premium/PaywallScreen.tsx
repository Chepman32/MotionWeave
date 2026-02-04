import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { CustomButton } from '../../shared/components/CustomButton';
import {
  PurchaseService,
  SubscriptionPlan,
} from '../../processes/iap/PurchaseService';

interface PaywallScreenProps {
  onClose: () => void;
  onPurchaseComplete: () => void;
  feature?: string;
}

const PREMIUM_FEATURES = [
  {
    icon: '🎨',
    title: 'All Premium Templates',
    description: '20+ exclusive layouts',
  },
  {
    icon: '🎬',
    title: 'Advanced Filters',
    description: '15+ professional filters',
  },
  {
    icon: '✍️',
    title: 'Text Overlays',
    description: 'Custom fonts & animations',
  },
  { icon: '4️⃣', title: '4K Export', description: 'Ultra HD quality' },
  {
    icon: '🎵',
    title: 'Background Music',
    description: '50+ royalty-free tracks',
  },
  { icon: '⚡', title: 'Priority Export', description: 'Faster processing' },
  { icon: '🚫', title: 'No Watermark', description: 'Clean exports' },
  { icon: '☁️', title: 'Cloud Backup', description: 'Sync across devices' },
];

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
  onClose,
  onPurchaseComplete,
  feature,
}) => {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const availablePlans = await PurchaseService.getOfferings();
      setPlans(availablePlans);
      if (availablePlans.length > 0) {
        // Default to annual plan
        const annual = availablePlans.find(p => p.id === 'annual');
        setSelectedPlan(annual || availablePlans[0]);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    try {
      setIsPurchasing(true);
      await PurchaseService.purchasePackage(selectedPlan.package);
      Alert.alert('Success', 'Welcome to MotionWeave Premium!');
      onPurchaseComplete();
      onClose();
    } catch (error: any) {
      if (error.message !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      const customerInfo = await PurchaseService.restorePurchases();
      const isPremium = await PurchaseService.isPremium();

      if (isPremium) {
        Alert.alert('Success', 'Your purchases have been restored!');
        onPurchaseComplete();
        onClose();
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Failed to restore purchases.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
        opacity={0.1}
      />

      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={[styles.closeButton, { top: insets.top + SPACING.md }]}>
        <Text style={{ fontSize: 28, color: colors.textPrimary }}>×</Text>
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Upgrade to Premium
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Unlock all features and create unlimited video collages
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <FeatureItem
              key={index}
              feature={feature}
              index={index}
              colors={colors}
            />
          ))}
        </View>

        {/* Plans */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.plans}>
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan?.id === plan.id}
                onSelect={() => setSelectedPlan(plan)}
                colors={colors}
                gradients={gradients}
              />
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <CustomButton
            onPress={handlePurchase}
            variant="primary"
            disabled={!selectedPlan || isPurchasing}
            loading={isPurchasing}
          >
            {isPurchasing ? 'Processing...' : 'Start Free Trial'}
          </CustomButton>

          <TouchableOpacity
            onPress={handleRestore}
            style={styles.restoreButton}
          >
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            7-day free trial, then {selectedPlan?.price}. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const FeatureItem: React.FC<{
  feature: { icon: string; title: string; description: string };
  index: number;
  colors: any;
}> = ({ feature, index, colors }) => {
  const translateX = useSharedValue(-50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      index * 50,
      withSpring(0, { damping: 15, stiffness: 100 }),
    );
    opacity.value = withDelay(index * 50, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.featureItem, animatedStyle]}>
      <Text style={styles.featureIcon}>{feature.icon}</Text>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
          {feature.title}
        </Text>
        <Text
          style={[styles.featureDescription, { color: colors.textSecondary }]}
        >
          {feature.description}
        </Text>
      </View>
      <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
    </Animated.View>
  );
};

const PlanCard: React.FC<{
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
  gradients: any;
}> = ({ plan, isSelected, onSelect, colors, gradients }) => {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onSelect)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPopular = plan.id === 'annual';

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.planCard, animatedStyle]}>
        {isPopular && (
          <View
            style={[styles.popularBadge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <LinearGradient
          colors={
            isSelected ? gradients.primary : [colors.surface, colors.surface]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.planCardGradient,
            {
              borderWidth: isSelected ? 0 : 2,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.planHeader}>
            <Text
              style={[
                styles.planTitle,
                { color: isSelected ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {plan.title}
            </Text>
            {plan.savings && (
              <View
                style={[
                  styles.savingsBadge,
                  { backgroundColor: colors.success },
                ]}
              >
                <Text style={styles.savingsText}>{plan.savings}</Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.planPrice,
              { color: isSelected ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            {plan.price}
          </Text>

          {plan.pricePerMonth && (
            <Text
              style={[
                styles.planPricePerMonth,
                {
                  color: isSelected
                    ? 'rgba(255,255,255,0.8)'
                    : colors.textSecondary,
                },
              ]}
            >
              {plan.pricePerMonth}
            </Text>
          )}

          <Text
            style={[
              styles.planDescription,
              {
                color: isSelected
                  ? 'rgba(255,255,255,0.8)'
                  : colors.textSecondary,
              },
            ]}
          >
            {plan.description}
          </Text>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  features: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  featureDescription: {
    ...TYPOGRAPHY.caption,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },
  plans: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  planCard: {
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planCardGradient: {
    padding: SPACING.lg,
    borderRadius: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  planTitle: {
    ...TYPOGRAPHY.h3,
  },
  savingsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planPrice: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  planPricePerMonth: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
  planDescription: {
    ...TYPOGRAPHY.caption,
  },
  ctaContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  restoreButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  restoreText: {
    ...TYPOGRAPHY.caption,
  },
  disclaimer: {
    ...TYPOGRAPHY.small,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
