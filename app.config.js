import {
  withAndroidManifest,
  withAppDelegate,
  withDangerousMod,
  withProjectBuildGradle,
} from "expo/config-plugins";

import fs from "fs/promises";
import path from "path";

const withYandexMapsLiteAndroid = (config) =>
  withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("useYandexMapsLite")) {
      contents = contents.replace(
        /buildscript\s*\{\s*ext\s*\{/m,
        `buildscript {\n    ext {\n        useYandexMapsLite = true`,
      );
    }

    config.modResults.contents = contents;

    return config;
  });

const withYandexMapsLiteEnv = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );

      const line = `ENV['USE_YANDEX_MAPS_LITE'] = "1"`;

      let podfile = await fs.readFile(podfilePath, "utf8");

      if (!podfile.includes(line)) {
        podfile = `${line}\n${podfile}`;

        await fs.writeFile(podfilePath, podfile);
      }

      return config;
    },
  ]);
};

const withYandexMaps = (config) => {
  const apiKey = "YOUR_API_KEY";

  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    const application = androidManifest.application?.[0];

    if (application) {
      application["meta-data"] = application["meta-data"] || [];

      const existing = application["meta-data"].find(
        (m) => m.$["android:name"] === "com.yandex.mapkit.api_key",
      );

      if (existing) {
        existing.$["android:value"] = apiKey;
      } else {
        application["meta-data"].push({
          $: {
            "android:name": "com.yandex.mapkit.api_key",
            "android:value": apiKey,
          },
        });
      }
    }

    return config;
  });

  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("import YandexMapsMobile")) {
      contents = contents.replace(
        /import React/,
        `import React
import YandexMapsMobile`,
      );
    }

    if (!contents.includes("YMKMapKit.setApiKey")) {
      const lines = contents.split("\n");

      let methodStartIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("didFinishLaunchingWithOptions")) {
          for (let j = i; j < lines.length && j < i + 5; j++) {
            if (lines[j].includes("-> Bool {")) {
              methodStartIndex = j;
              break;
            }
          }

          if (methodStartIndex === -1 && lines[i].includes("{")) {
            methodStartIndex = i;
          }

          break;
        }
      }

      if (methodStartIndex !== -1) {
        const indent = lines[methodStartIndex].match(/^(\s*)/)?.[1] || "  ";

        const initCode = `
${indent}YMKMapKit.setLocale("ru_RU")
${indent}YMKMapKit.setApiKey("${apiKey}")`;

        lines.splice(methodStartIndex + 1, 0, initCode);

        contents = lines.join("\n");
      } else {
        contents = contents.replace(
          /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
          `
    YMKMapKit.setLocale("ru_RU")
    YMKMapKit.setApiKey("${apiKey}")

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`,
        );
      }
    }

    config.modResults.contents = contents;

    return config;
  });

  return config;
};

export default ({ config }) => {
  let cfg = {
    ...config,

    name: "expo-yamap-example",
    slug: "expo-yamap-example",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "expoyamapexample",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.expoyamapexample",

      infoPlist: {
        YMKMapKitApiKey: "YOUR_API_KEY",
      },
    },

    android: {
      package: "com.expoyamapexample",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    plugins: ["expo-router", withYandexMaps],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };

  cfg = withYandexMaps(cfg);
  cfg = withYandexMapsLiteEnv(cfg);
  cfg = withYandexMapsLiteAndroid(cfg);

  return cfg;
};
