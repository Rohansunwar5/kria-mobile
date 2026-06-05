import { getItem, setItem } from './secureStore';

const ONBOARDING_KEY = 'onboardingComplete';

export async function getOnboardingComplete(): Promise<boolean> {
  return (await getItem(ONBOARDING_KEY)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await setItem(ONBOARDING_KEY, 'true');
}
