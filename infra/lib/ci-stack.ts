import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

import type { Config } from "./config";

/**
 * CI prerequisites: the image repository and the role GitHub Actions
 * assumes with OIDC (no long-lived AWS keys). Deployed once by an admin;
 * after that CI deploys everything else.
 */
export class CiStack extends Stack {
  readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, config: Config, props?: StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: config.appName,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 30, description: "Keep recent images for rollback" }],
    });

    const provider = new iam.OpenIdConnectProvider(this, "GithubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const github = (sub: string) =>
      new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike: { "token.actions.githubusercontent.com:sub": sub },
      });

    // Deploys: only workflow jobs in the protected `production` environment.
    const deployRole = new iam.Role(this, "DeployRole", {
      roleName: `${config.appName}-github-deploy`,
      assumedBy: github(`repo:${config.githubRepo}:environment:production`),
      maxSessionDuration: Duration.hours(2),
      description: "GitHub Actions deploys (production environment only)",
    });
    this.repository.grantPullPush(deployRole);
    ecr.AuthorizationToken.grantRead(deployRole);
    // CDK deploys go through the bootstrap roles, which hold the real permissions.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*-${this.account}-${this.region}`],
      })
    );

    // Pull requests: read-only, for `cdk diff`. Only the bootstrap *lookup*
    // role (read-only); never the deploy role, which could change the stack.
    const diffRole = new iam.Role(this, "DiffRole", {
      roleName: `${config.appName}-github-diff`,
      assumedBy: github(`repo:${config.githubRepo}:pull_request`),
      maxSessionDuration: Duration.hours(1),
      description: "GitHub Actions cdk diff on pull requests (read-only)",
    });
    diffRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-lookup-role-${this.account}-${this.region}`,
        ],
      })
    );
    diffRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:GetTemplate", "cloudformation:DescribeStacks"],
        resources: [`arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/Jobsapp*/*`],
      })
    );
  }
}
