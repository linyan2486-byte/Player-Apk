const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [
  /\/android\/build\/.*$/,
  /\/android\/\.gradle\/.*$/,
  /\/android\/\.cxx\/.*$/,
  /\/node_modules\/.*\/android\/build\/.*$/,
  /\/node_modules\/.*\/android\/\.cxx\/.*$/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Keep CSS virtual during export so Metro can hash the generated module.
  // Native builds still receive the same generated styles through NativeWind.
  forceWriteFileSystem: false,
});
