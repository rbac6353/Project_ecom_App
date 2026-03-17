// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ✅ แก้ปัญหา Stripe บน web: สร้าง resolver สำหรับ web platform
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // ถ้าเป็น web และพยายาม import @stripe/stripe-react-native
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    // Return path ไปยัง stub file สำหรับ web
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/stubs/stripe-web-stub.tsx'),
    };
  }
  
  // ถ้าเป็น web และพยายาม import react-native-pager-view
  if (platform === 'web' && moduleName === 'react-native-pager-view') {
    // Return path ไปยัง stub file สำหรับ web
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/stubs/pager-view-web-stub.tsx'),
    };
  }
  
  // ใช้ default resolver สำหรับ module อื่นๆ
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

