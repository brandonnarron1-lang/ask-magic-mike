const path = require("node:path");
const fs = require("node:fs");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(repositoryRoot, "app/lib"), path.join(repositoryRoot, "config")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules")];
config.maxWorkers = 1;
config.fileMapCacheDirectory = path.join(projectRoot, ".cache/metro-map");
fs.mkdirSync(config.fileMapCacheDirectory, { recursive: true });
config.cacheStores = [new FileStore({ root: path.join(projectRoot, ".cache/metro-transform") })];
// Only reviewed public dependencies may resolve outside this isolated project.
const publicFiles = new Set([
  "app/lib/groundedConciergeContract.ts", "app/lib/experienceContract.ts",
  "app/lib/consumerInterests.ts", "app/lib/buyerInterest.ts",
  "app/lib/client/publicIntakeReview.ts", "app/lib/leadContactValidation.ts",
  "config/experience-contract.v1.json",
].map(file => path.join(repositoryRoot, file)));
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const result = context.resolveRequest(context, moduleName, platform);
  if (result.type === "sourceFile" && result.filePath !== "\0polyfill:assets-registry"
      && !result.filePath.startsWith(projectRoot + path.sep)
      && !publicFiles.has(result.filePath)) {
    throw new Error(`Unreviewed dependency outside the R3 native project: ${result.filePath}`);
  }
  return result;
};
module.exports = config;
