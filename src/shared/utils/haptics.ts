import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export class HapticService {
  private static enabled = true;

  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  static light() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('impactLight', options);
  }

  static medium() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('impactMedium', options);
  }

  static heavy() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('impactHeavy', options);
  }

  static success() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('notificationSuccess', options);
  }

  static warning() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('notificationWarning', options);
  }

  static error() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('notificationError', options);
  }

  static selection() {
    if (!this.enabled) return;
    ReactNativeHapticFeedback.trigger('selection', options);
  }
}
