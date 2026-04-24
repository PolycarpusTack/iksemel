import type { Configuration } from "electron-builder";

const config: Configuration = {
  appId: "com.whatson.xfeb",
  productName: "XML Filter & Export Builder",
  copyright: "Copyright © 2026",
  directories: {
    output: "dist-electron",
    buildResources: "build",
  },
  files: [
    "out/**",
    "package.json",
  ],
  extraMetadata: {
    main: "out/main/index.js",
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "zip", arch: ["x64"] },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  mac: {
    target: [
      { target: "dmg", arch: ["universal"] },
    ],
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
  },
  dmg: {
    sign: false,
  },
  publish: {
    provider: "github",
    releaseType: "release",
  },
};

export default config;
