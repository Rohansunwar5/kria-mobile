import { Linking } from 'react-native';
import { render } from '@testing-library/react-native';
import { createOnShouldStartLoadWithRequest } from 'react-native-webview/lib/WebViewShared';
import { RazorpayWebView } from '@/components/tournament/RazorpayWebView';

// LAUNCH-AUDIT H14: paying with a UPI app from inside the checkout WebView.

let props: any;
jest.mock('react-native-webview', () => ({
  WebView: (p: any) => { props = p; return null; },
}));

const order = { orderId: 'order_1', amount: 628.32, currency: 'INR', keyId: 'rzp_test' } as any;

/** A navigation the checkout starts, through react-native-webview's own gate. */
function navigate(url: string) {
  const loadRequest = jest.fn();
  createOnShouldStartLoadWithRequest(loadRequest, props.originWhitelist, props.onShouldStartLoadWithRequest)({ nativeEvent: { url, lockIdentifier: 1 } } as any);
  return loadRequest.mock.calls[0][0] as boolean;
}

beforeEach(() => {
  jest.clearAllMocks(); // jest-expo's Linking is one shared mock
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  // Android 11+ answers false here unless the manifest lists the scheme.
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
  render(<RazorpayWebView orderDetails={order} playerName="Asha" playerEmail="a@b.c" onSuccess={jest.fn()} onDismiss={jest.fn()} />);
});
afterEach(() => jest.restoreAllMocks());

it('hands a upi:// link to the phone, without asking canOpenURL first', () => {
  expect(navigate('upi://pay?pa=kria@hdfc&am=628.32')).toBe(false);
  expect(Linking.openURL).toHaveBeenCalledWith('upi://pay?pa=kria@hdfc&am=628.32');
});

it('opens the UPI app an intent:// link names, which the WebView cannot load', () => {
  navigate('intent://pay?pa=kria@hdfc&am=628.32#Intent;scheme=upi;package=com.phonepe.app;end');
  expect(Linking.openURL).toHaveBeenCalledWith('upi://pay?pa=kria@hdfc&am=628.32');
});

it('keeps Razorpay pages in the WebView', () => {
  expect(navigate('https://api.razorpay.com/v1/checkout/public')).toBe(true);
  expect(navigate('about:blank')).toBe(true);
  expect(Linking.openURL).not.toHaveBeenCalled();
});

it('gives checkout the amount in paise, as Razorpay expects', () => {
  expect(props.source.html).toContain('amount: 62832,');
});
