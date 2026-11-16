import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";

import { AppStack } from "../lib/app-stack";
import { CiStack } from "../lib/ci-stack";
import { loadConfig } from "../lib/config";
import { DataStack } from "../lib/data-stack";
import { OpsStack } from "../lib/ops-stack";

const env = { account: "111111111111", region: "us-east-1" };
const app = new App({
  context: {
    "jobsapp:imageTag": "abc123",
    "jobsapp:domainName": "jobs.example.com",
    "jobsapp:hostedZoneId": "Z000",
    "jobsapp:hostedZoneName": "example.com",
    "jobsapp:githubRepo": "org/repo",
    "jobsapp:alarmEmail": "ops@example.com",
    "availability-zones:account=111111111111:region=us-east-1": ["us-east-1a", "us-east-1b"],
  },
});
const config = loadConfig(app);
const ci = new CiStack(app, "JobsappCi", config, { env });
const data = new DataStack(app, "JobsappData", config, { env });
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

describe("DataStack", () => {
  const t = Template.fromStack(data);
  it("retains an encrypted, versioned, private bucket", () => {
    t.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      Properties: Match.objectLike({
        VersioningConfiguration: { Status: "Enabled" },
        PublicAccessBlockConfiguration: Match.objectLike({ BlockPublicAcls: true, RestrictPublicBuckets: true }),
        BucketEncryption: Match.objectLike({
          ServerSideEncryptionConfiguration: [Match.objectLike({ BucketKeyEnabled: true })],
        }),
      }),
    });
    expect(data.terminationProtection).toBe(true);
  });
  it("never expires replica generations by age", () => {
    const rules = Object.values(t.findResources("AWS::S3::Bucket"))[0].Properties.LifecycleConfiguration.Rules;
    expect(rules.filter((r: { Prefix?: string }) => r.Prefix?.startsWith("db/"))).toEqual([]);
  });
});

describe("AppStack", () => {
  const t = Template.fromStack(appStack);
  it("deploys one ARM task blue/green with the handoff hook", () => {
    t.hasResourceProperties("AWS::ECS::Service", {
      DesiredCount: 1,
      DeploymentConfiguration: Match.objectLike({
        Strategy: "BLUE_GREEN",
        LifecycleHooks: [
          Match.objectLike({
            LifecycleStages: Match.arrayWith(["PRE_PRODUCTION_TRAFFIC_SHIFT", "PRODUCTION_TRAFFIC_SHIFT"]),
          }),
        ],
      }),
    });
    t.hasResourceProperties("AWS::ECS::TaskDefinition", {
      RuntimePlatform: { CpuArchitecture: "ARM64", OperatingSystemFamily: "LINUX" },
      ContainerDefinitions: [Match.objectLike({ ReadonlyRootFilesystem: true })],
    });
  });
  it("only lets the ALB reach tasks", () => {
    t.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 8080,
      SourceSecurityGroupId: Match.anyValue(),
    });
    const open = Object.values(t.findResources("AWS::EC2::SecurityGroup")).flatMap(
      (sg) => (sg.Properties.SecurityGroupIngress ?? []) as { CidrIp?: string; FromPort: number }[]
    );
    expect(open.filter((r) => r.CidrIp === "0.0.0.0/0").map((r) => r.FromPort).sort()).toEqual([443, 80]);
  });
  it("has no NAT gateway", () => {
    t.resourceCountIs("AWS::EC2::NatGateway", 0);
  });
});

describe("OpsStack", () => {
  const t = Template.fromStack(ops);
  it("defines the runbooks", () => {
    const names = Object.values(t.findResources("AWS::SSM::Document")).map((d) => d.Properties.Name).sort();
    expect(names).toEqual(
      [
        "ExportDatabase",
        "MaintenanceMode",
        "PointInTimeRestore",
        "RestartService",
        "RollbackDeployment",
        "RotateCookieSecret",
        "Status",
        "VerifyBackup",
        "WriterHandoff",
      ].map((n) => `jobsapp-${n}`)
    );
  });
  it("defaults point-in-time restore to a dry run", () => {
    const doc = Object.values(t.findResources("AWS::SSM::Document")).find(
      (d) => d.Properties.Name === "jobsapp-PointInTimeRestore"
    )!;
    expect(doc.Properties.Content.parameters.Mode.default).toBe("dry-run");
  });
  it("requires MFA for the operator role", () => {
    t.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "jobsapp-operator",
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [Match.objectLike({ Condition: { Bool: { "aws:MultiFactorAuthPresent": "true" } } })],
      }),
    });
  });
});
