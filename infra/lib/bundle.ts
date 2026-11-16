import path from "node:path";

import { AssetHashType, DockerImage } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { buildSync } from "esbuild";

/**
 * Lambda code bundled in-process with the infra package's esbuild (no npx or
 * Docker). The AWS SDK v3 is provided by the Lambda runtime.
 */
export function bundledCode(entry: string): lambda.Code {
  return lambda.Code.fromAsset(path.dirname(entry), {
    // Hash the bundle, not the source dir: the hook also includes
    // app/src/ops/control.ts, which lives outside it.
    assetHashType: AssetHashType.OUTPUT,
    bundling: {
      image: DockerImage.fromRegistry("unused-local-bundling"),
      local: {
        tryBundle(outputDir: string) {
          buildSync({
            entryPoints: [entry],
            bundle: true,
            platform: "node",
            target: "node24",
            format: "esm",
            outfile: path.join(outputDir, "index.mjs"),
            external: ["@aws-sdk/*"],
            sourcemap: "inline",
            logLevel: "warning",
          });
          return true;
        },
      },
    },
  });
}
