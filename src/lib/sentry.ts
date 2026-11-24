import * as Sentry from '@sentry/react-native';

// Crash reporting (LAUNCH-AUDIT H22). Off until EXPO_PUBLIC_SENTRY_DSN is set
// for the build; with it, uncaught errors and the error screen's reports go to Sentry.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn, enabled: !!dsn });
