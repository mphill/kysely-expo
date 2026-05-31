const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const emptyStub = path.resolve(__dirname, "metro-stubs/empty.js");

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  const resolved = resolve(context, moduleName, platform);

  if (
    resolved.type === "sourceFile" &&
    resolved.filePath
      .replace(/\\/g, "/")
      .endsWith("kysely/dist/migration/file-migration-provider.js")
  ) {
    return { type: "sourceFile", filePath: emptyStub };
  }

  return resolved;
};

module.exports = config;
