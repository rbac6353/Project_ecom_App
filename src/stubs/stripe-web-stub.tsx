// Stub สำหรับ @stripe/stripe-react-native บน web และ Expo Go
// ไฟล์นี้จะถูกใช้แทน @stripe/stripe-react-native เมื่อรันบน web platform หรือ Expo Go
// (เพราะ Expo Go ไม่รองรับ native module OnrampSdk)

import React from 'react';

// Empty StripeProvider สำหรับ web (ไม่ทำอะไร แค่ return children)
export const StripeProvider = ({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) => {
  return <React.Fragment>{children}</React.Fragment>;
};

// Export hooks ที่ return functions สำหรับ web
export const useStripe = () => ({
  initPaymentSheet: () => Promise.resolve({ error: null }),
  presentPaymentSheet: () => Promise.resolve({ error: null }),
  confirmPayment: () => Promise.resolve({ error: null }),
  createPaymentMethod: () => Promise.resolve({ error: null, paymentMethod: null }),
});

export const useConfirmPayment = () => ({
  confirmPayment: () => Promise.resolve({ error: null }),
});

// Export empty components สำหรับ web
export const CardField = () => null;
export const PaymentSheet = () => null;
export const AddToWalletButton = () => null;
export const AuBECSDebitForm = () => null;

