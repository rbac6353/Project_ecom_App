import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './en.json';
import th from './th.json';

const resources = {
  en: { translation: en },
  th: { translation: th },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('language');

  if (!savedLanguage) {
    // ถ้ายังไม่เคยเลือก ให้ดูภาษาเครื่อง
    // expo-localization คืนค่าเป็น 'en-US', 'th-TH' -> เราเอาแค่ 2 ตัวหน้า
    const locales = Localization.getLocales();
    savedLanguage = locales[0]?.languageCode || 'th';
    
    // ถ้า languageCode เป็น 'en' หรือ 'th' ใช้ได้เลย ถ้าไม่ใช่ให้ default เป็น 'th'
    if (savedLanguage !== 'en' && savedLanguage !== 'th') {
      savedLanguage = 'th';
    }
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage, // ภาษาเริ่มต้น
      fallbackLng: 'th',  // ถ้าหาไม่เจอใช้ th (เพราะแอปเป็นไทยเป็นหลัก)
      interpolation: {
        escapeValue: false, // React จัดการเรื่อง XSS ให้แล้ว
      },
      compatibilityJSON: 'v3',
    });
};

initI18n();

export default i18n;

