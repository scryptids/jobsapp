import type { App } from "aws-cdk-lib";

/**
 * Deployment settings, from CDK context (`cdk.json`, `cdk.context.json` or
 * `-c jobsapp:key=value`). Values that identify you (domain, email) are
 * deliberately not committed; set them in `cdk.context.json` (gitignored is
 * up to you) or pass them from CI variables.
 */
export type Config = {
  appName: string;
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  alarmEmail: string;
  githubRepo: string;
  /** Image tag in ECR; empty while only bootstrapping CI. */
  imageTag: string;
  enableWaf: boolean;
  monthlyBudgetUsd: number;
};

export function loadConfig(app: App): Config {
  const get = (key: string) => app.node.tryGetContext(`jobsapp:${key}`);
  const bool = (v: unknown) => v === true || v === "true";
  return {
    appName: get("appName") ?? "jobsapp",
    domainName: get("domainName") ?? "",
    hostedZoneId: get("hostedZoneId") ?? "",
    hostedZoneName: get("hostedZoneName") ?? "",
    alarmEmail: get("alarmEmail") ?? "",
    githubRepo: get("githubRepo") ?? "",
    imageTag: get("imageTag") ?? "",
    enableWaf: bool(get("enableWaf") ?? true),
    monthlyBudgetUsd: Number(get("monthlyBudgetUsd") ?? 60),
  };
}

export function requireKeys(config: Config, keys: (keyof Config)[]) {
  const missing = keys.filter((k) => config[k] === "" || config[k] === undefined);
  if (missing.length) {
    throw new Error(
      `Missing CDK context: ${missing.map((k) => `jobsapp:${k}`).join(", ")}. ` +
        "Set them in cdk.context.json or pass -c jobsapp:<key>=<value>."
    );
  }
}
