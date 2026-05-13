# Expo + react-native-yamap-plus

Базовый пример интеграции Яндекс.Карт в Expo приложение через библиотеку `react-native-yamap-plus`.

Библиотека предоставляет React Native обертку над нативным Yandex MapKit SDK и позволяет использовать полноценные Яндекс.Карты внутри мобильного приложения.

Поддерживаются:

- iOS
- Android
- Expo (через prebuild)

---

# Возможности библиотеки

`react-native-yamap-plus` поддерживает:

- интерактивную карту
- кастомизацию маркеров
- управление камерой
- изменение zoom
- night mode
- отображение пользовательской позиции на карте
- поиск
- маршруты
- offline cache

---

# Документация

GitHub:
https://github.com/Qudaeo/react-native-yamap-plus

npm:
https://www.npmjs.com/package/react-native-yamap-plus

---

# Установка

```bash
npm install
```

---

# Генерация нативных проектов

Так как библиотека использует нативный Yandex SDK, она не работает внутри Expo Go.

Необходимо выполнить:

```bash
npx expo prebuild
```

После этого Expo создаст:

- ios
- android

и подключит все необходимые нативные зависимости.

---

# Запуск проекта

iOS:

```bash
npx expo run:ios
```

Android:

```bash
npx expo run:android
```

---

# Подключение API ключа через app.config.ts

В проекте API ключ Yandex MapKit подключается автоматически через Expo Config Plugin.

Это позволяет:

- не изменять нативные файлы вручную
- автоматически прокидывать ключ при `expo prebuild`
- хранить ключ в одном месте
- удобно работать с несколькими environment (prod/test/dev)

# app.config.ts

```ts
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
```

---

# После изменения app.config.ts

Необходимо заново пересобрать native проекты:

```bash
npx expo prebuild --clean
```

iOS:

```bash
cd ios && pod install && cd ..
```

---

# Важное замечание

Изменения в `app.config.ts` применяются только после:

```bash
npx expo prebuild
```

или

```bash
npx expo prebuild --clean
```

Потому что Expo генерирует:

- AndroidManifest.xml
- AppDelegate.swift

на основе config plugins.

# Инициализация Yandex MapKit

После подключения API ключа необходимо обязательно инициализировать `YamapInstance`.

Без этого карта может отображать только сетку и не загружать тайлы.

Добавьте инициализацию перед использованием `Yamap`.

```tsx
import { YamapInstance } from "react-native-yamap-plus";

YamapInstance.init("YOUR_API_KEY");
```

---

# Базовое использование

```tsx
import { Yamap, Marker } from "react-native-yamap-plus";

YamapInstance.init("YOUR_API_KEY");

<Yamap
  ref={mapRef}
  initialRegion={{
    lat: 51.128207,
    lon: 71.43042,
    zoom: 12,
  }}
  style={{ flex: 1 }}
>
  <Marker
    point={{
      lat: 51.128207,
      lon: 71.43042,
    }}
  />
</Yamap>;
```

---

# Управление камерой

## Получение позиции камеры

```tsx
mapRef.current?.getCameraPosition((position) => {
  console.log(position);
});
```

## Изменение zoom

```tsx
mapRef.current?.setZoom(14, 0);
```

## Перемещение камеры

```tsx
mapRef.current?.setCenter(
  {
    lat: 51.128207,
    lon: 71.43042,
  },
  14,
  300,
  false,
  false,
);
```

---

# Маркеры

```tsx
<Marker
  point={{
    lat: 51.128207,
    lon: 71.43042,
  }}
/>
```

---

# Особенности iOS

На iOS Yandex MapKit иногда может некорректно инициализироваться при первом рендере экрана.

Из-за особенностей работы нативного SDK в некоторых случаях карта отображается пустой или появляется только после повторного рендера.

Для повышения стабильности в проекте используется небольшая задержка перед монтированием компонента `Yamap` через `setTimeout`.

Также в некоторых случаях помогает ограничение высоты карты вместо использования полного `screenHeight`.

```tsx
height: IS_IOS ? 800 : screenHeight;
```

---

# Важные замечания

- Библиотека использует нативный Yandex MapKit SDK
- Expo Go не поддерживается
- Требуется `expo prebuild`
- После изменения нативных настроек рекомендуется выполнять:

```bash
npx expo prebuild --clean
```
