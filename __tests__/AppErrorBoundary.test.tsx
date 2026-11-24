import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

// LAUNCH-AUDIT H22: a render error used to close the app and leave no record.

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), init: jest.fn() }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: (...a: unknown[]) => mockReplace(...a) }) }));

it('shows a way back instead of closing, and reports the error', () => {
  const retry = jest.fn(async () => {});
  const error = new Error('boom');
  render(<AppErrorBoundary error={error} retry={retry} />);

  expect(screen.getByText('Something went wrong')).toBeTruthy();
  expect(Sentry.captureException).toHaveBeenCalledWith(error);
  fireEvent.press(screen.getByLabelText('Try again'));
  expect(retry).toHaveBeenCalledTimes(1);
});

// A screen that fails every time would otherwise leave Try again as the only way out.
it('offers a way home too', () => {
  const retry = jest.fn(async () => {});
  render(<AppErrorBoundary error={new Error('boom')} retry={retry} />);
  fireEvent.press(screen.getByLabelText('Go to Home'));
  expect(mockReplace).toHaveBeenCalledWith('/');
  expect(retry).toHaveBeenCalledTimes(1);
});

describe('crash reporting', () => {
  const start = (dsn?: string) => {
    jest.isolateModules(() => {
      if (dsn) process.env.EXPO_PUBLIC_SENTRY_DSN = dsn; else delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      require('@/lib/sentry');
    });
    return (Sentry.init as jest.Mock).mock.calls.at(-1)[0];
  };
  afterEach(() => { delete process.env.EXPO_PUBLIC_SENTRY_DSN; });

  it('stays off until a DSN is set', () => {
    expect(start()).toMatchObject({ enabled: false });
  });

  it('reports to the DSN once one is set', () => {
    expect(start('https://key@o1.ingest.sentry.io/2')).toMatchObject({ dsn: 'https://key@o1.ingest.sentry.io/2', enabled: true });
  });
});
