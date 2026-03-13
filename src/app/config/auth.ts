/**
 * OAuth Client IDs สำหรับล็อกอินด้วย Google และ Facebook
 * ตั้งค่าใน .env หรือ app config (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_FACEBOOK_APP_ID)
 * Google: ใช้ Client ID เดียวกับ Backend (GOOGLE_CLIENT_ID) จาก Google Cloud Console
 * Facebook: App ID จาก Facebook for Developers
 */
const _gWeb = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const _gIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? _gWeb;
const _gAndroid = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? _gWeb;
const _fb = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';

export const AUTH_CONFIG = {
  google: {
    webClientId: _gWeb || 'placeholder',
    iosClientId: _gIos || 'placeholder',
    androidClientId: _gAndroid || 'placeholder',
  },
  facebook: {
    appId: _fb || 'placeholder',
  },
};

export const hasGoogleAuth = _gWeb.length > 0 || _gIos.length > 0 || _gAndroid.length > 0;
export const hasFacebookAuth = _fb.length > 0;
