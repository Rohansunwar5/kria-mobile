import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { OrderDetails } from '@/api/payment';

function razorpayHtml(order: OrderDetails, name: string, email: string, contact?: string): string {
  const prefill = JSON.stringify({ name, email, ...(contact ? { contact } : {}) });
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;background:#111;">
<script>
  window.onload = function() {
    var rzp = new Razorpay({
      key: ${JSON.stringify(order.keyId)},
      amount: ${order.amount},
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
        onMessage={onMessage}
        onLoadEnd={() => setWebviewLoaded(true)}
        onError={() => onDismiss()}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        style={{ flex: 1, backgroundColor: '#111111' }}
      />
      {!webviewLoaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' }}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      )}
    </View>
  );
}
