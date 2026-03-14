module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@app': './src/app',
            '@features': './src/features',
            '@shared': './src/shared',
            '@navigation': './src/navigation',
            '@assets': './src/assets',
            '@types': './src/types'
          }
        }
      ],
      'react-native-reanimated/plugin', // ต้องอยู่ท้ายสุดเสมอ
    ],
  };
};

