import { App, Tags, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";

import { AppStack } from "../lib/app-stack";
import { CiStack } from "../lib/ci-stack";
import { loadConfig, requireKeys } from "../lib/config";
import { DataStack } from "../lib/data-stack";
import { applyNagSuppressions } from "../lib/nag";
import { OpsStack } from "../lib/ops-stack";

const app = new App();
const config = loadConfig(app);
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

Tags.of(app).add("app", config.appName);

// CI first (deployed once by an admin); it only needs the GitHub repo.
requireKeys(config, ["githubRepo"]);
const ci = new CiStack(app, "JobsappCi", config, { env });
const data = new DataStack(app, "JobsappData", config, { env });

const stacks: (CiStack | DataStack | AppStack | OpsStack)[] = [ci, data];

// The app needs an image; until CI has pushed one, only CI/Data synthesize.
if (config.imageTag) {
  requireKeys(config, ["domainName", "hostedZoneId", "hostedZoneName"]);
  const appStack = new AppStack(app, "JobsappApp", {
    env,
    config,
    repository: ci.repository,
    bucket: data.bucket,
    dataKey: data.key,
  });
  const ops = new OpsStack(app, "JobsappOps", {
    env,
    config,
    cluster: appStack.cluster,
    service: appStack.service,
    opsTaskDefinition: appStack.opsTaskDefinition,
    vpc: appStack.vpc,
    taskSecurityGroup: appStack.taskSecurityGroup,
    cookieSecret: appStack.cookieSecret,
    alarmTopic: appStack.alarmTopic,
    logGroup: appStack.logGroup,
    bucket: data.bucket,
    dataKey: data.key,
  });
  stacks.push(appStack, ops);
}

for (const stack of stacks) applyNagSuppressions(stack);
Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
