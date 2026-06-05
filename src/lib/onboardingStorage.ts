import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'onboardingComplete';

export async function getOnboardingComplete(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}
