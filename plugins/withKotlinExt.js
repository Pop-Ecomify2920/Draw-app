const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** Adds ext.kotlinVersion to root build.gradle for @react-native-menu/menu and other libs */
function withKotlinExt(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let contents = fs.readFileSync(buildGradlePath, 'utf8');

      const extBlock = `
// Added by withKotlinExt - fixes @react-native-menu/menu Kotlin compilation
ext {
  kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.24'
}
`;
      if (!contents.includes('ext {') || !contents.includes('kotlinVersion')) {
        contents = extBlock.trim() + '\n\n' + contents;
        fs.writeFileSync(buildGradlePath, contents);
      }
      return config;
    },
  ]);
}

module.exports = withKotlinExt;
