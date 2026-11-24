import { useState } from 'react';
import { View, ActivityIndicator, Linking } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { OrderDetails } from '@/api/payment';
import { colors } from '@/constants/theme';

function razorpayHtml(order: OrderDetails, name: string, email: string, contact?: string): string {
  const prefill = JSON.stringify({ name, email, ...(contact ? { contact } : {}) });
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;background:${colors.bg};">
<script>
  window.onload = function() {
    var rzp = new Razorpay({
      key: ${JSON.stringify(order.keyId)},
      amount: ${Math.round(order.amount * 100)}, // paise; the server sends rupees
      currency: ${JSON.stringify(order.currency)},
      order_id: ${JSON.stringify(order.orderId)},
      name: 'Kria Sports',
      prefill: ${prefill},
      handler: function(r) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          success: true,
          razorpayPaymentId: r.razorpay_payment_id,
          razorpayOrderId: r.razorpay_order_id,
          razorpaySignature: r.razorpay_signature
        }));
      },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ success: false }));
        }
      }
    });
    rzp.open();
  };
</script>
</body>
</html>`;
}

/**
 * Where a checkout navigation should go instead of the WebView, or null to load
 * it there (LAUNCH-AUDIT H14). Choosing a UPI app sends `upi://pay?…`, or for a
 * named app (GPay, PhonePe) `intent://pay?…#Intent;scheme=upi;package=…;end`,
 * which no WebView can load: it becomes the plain `upi://` link the app opens.
 */
function externalUrl(url: string): string | null {
  if (/^(https?|about|data|blob|javascript):/i.test(url)) return null;
  const intent = /^intent:\/\/([^#]*)#Intent;(.*)$/i.exec(url);
  if (!intent) return url;
  const scheme = /(?:^|;)scheme=([^;]+)/.exec(intent[2])?.[1];
  return scheme ? `${scheme}://${intent[1]}` : url; // no scheme: openURL fails quietly, checkout stays
}

// A link for the phone goes straight to openURL. react-native-webview's own
// handling asks canOpenURL first, which is false on Android 11+ for a scheme
// the manifest doesn't list, so a UPI app never opened. openURL needs no listing.
// ponytail: unverified on a device (LAUNCH-AUDIT section 7). If GPay/PhonePe still fail, switch to react-native-razorpay.
function onShouldStartLoad(req: ShouldStartLoadRequest): boolean {
  const external = externalUrl(req.url);
  if (external === null) return true;
  Linking.openURL(external).catch(() => {}); // app not installed: checkout stays open for another method
  return false;
}

export function RazorpayWebView({ orderDetails, playerName, playerEmail, playerContact, onSuccess, onDismiss }: {
  orderDetails: OrderDetails;
  playerName: string;
  playerEmail: string;
  playerContact?: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onDismiss: () => void;
}) {
  const [webviewLoaded, setWebviewLoaded] = useState(false);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.success) {
        onSuccess(data.razorpayPaymentId, data.razorpaySignature);
      } else {
        onDismiss();
      }
    } catch { onDismiss(); }
  };

  const html = razorpayHtml(orderDetails, playerName, playerEmail, playerContact);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onMessage={onMessage}
        onLoadEnd={() => setWebviewLoaded(true)}
        onError={() => onDismiss()}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        style={{ flex: 1, backgroundColor: colors.bg }}
      />
      {!webviewLoaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}
    </View>
  );
}
