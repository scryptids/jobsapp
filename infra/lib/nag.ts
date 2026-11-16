import { Validations, type Stack } from "aws-cdk-lib";

/**
 * Reviewed exceptions to the cdk-nag AwsSolutions pack. cdk-nag v3 needs
 * each finding acknowledged individually, so this lists them by stack.
 * When a synth reports a new finding, review it before adding it here.
 */
export function applyNagSuppressions(stack: Stack) {
  const { account, region } = stack;
  const bucket = "JobsappData:ExportsOutputFnGetAttReplicaBucketB570B599Arn0551B772";
  const opsTaskDefinition = `arn:<AWS::Partition>:ecs:${region}:${account}:task-definition/JobsappAppOpsTaskDef99369CA7:*`;

  const acks: Record<string, [string, string][]> = {
    JobsappCi: [
      ["AwsSolutions-IAM5[Resource::*]", "ecr:GetAuthorizationToken has no resource scope."],
      [
        `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:iam::${account}:role/cdk-hnb659fds-*-${account}-${region}]`,
        "CI may assume only this account's CDK bootstrap roles.",
      ],
      [
        `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:cloudformation:${region}:${account}:stack/Jobsapp*/*]`,
        "Read-only template access for this app's stacks (cdk diff).",
      ],
    ],
    JobsappApp: [
      ["AwsSolutions-ECS4", "Container Insights disabled for cost; app metrics use EMF logs."],
      [
        "AwsSolutions-IAM5[Resource::*]",
        "ecr:GetAuthorizationToken and logs on generated roles; ecs:DescribeServiceRevisions has no resource scope.",
      ],
      [`AwsSolutions-IAM5[Resource::${bucket}/*]`, "Litestream reads/writes objects across the replica bucket."],
      [`AwsSolutions-IAM5[Resource::${bucket}/control/*]`, "The deploy hook only touches control documents."],
      ["AwsSolutions-IAM5[Resource::<DeployHookC8885C7C.Arn>:*]", "ECS invokes any version of the hook function."],
      [
        "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]",
        "Standard Lambda logging policy.",
      ],
      [
        "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonECSInfrastructureRolePolicyForLoadBalancers]",
        "AWS-maintained policy ECS blue/green requires to shift ALB traffic.",
      ],
    ],
    JobsappOps: [
      [`AwsSolutions-IAM5[Resource::${opsTaskDefinition}]`, "Runbooks run any revision of the ops task family."],
      [
        `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:ecs:${region}:${account}:task/JobsappApp:ExportsOutputRefClusterEB0386A796A0E3FE/*]`,
        "Describe tasks in this cluster only.",
      ],
      ["AwsSolutions-IAM5[Resource::*]", "Read-only SSM/ECS/CloudWatch describe APIs for operators."],
      [`AwsSolutions-IAM5[Resource::${bucket}/exports/*]`, "Operators download database exports only."],
      [
        `AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:ssm:${region}:${account}:automation-definition/jobsapp-*]`,
        "Operators may start only this app's runbooks.",
      ],
    ],
  };

  const common: [string, string][] = [
    ["AwsSolutions-S1", "Replica bucket access logs skipped for cost; CloudTrail covers management events."],
    ["AwsSolutions-ELB2", "ALB access logs skipped for cost; WAF metrics and app logs cover requests."],
    ["AwsSolutions-EC23", "The ALB is public by design: HTTPS 443 and the 80→443 redirect only."],
    ["AwsSolutions-ECS2", "Environment variables hold only non-secret config; secrets come from Secrets Manager."],
    [
      "AwsSolutions-SMG4",
      "Cookie secrets rotate via the RotateCookieSecret runbook (old values stay valid); the test-traffic token is low value.",
    ],
    ["AwsSolutions-L1", "Pinned to the Node LTS line the app uses, not the newest runtime."],
  ];

  for (const [id, reason] of [...common, ...(acks[stack.stackName] ?? [])]) {
    Validations.of(stack).acknowledge({ id: `AwsSolutions::${id}`, reason });
  }
  if (stack.stackName === "JobsappApp") {
    Validations.of(stack).acknowledge({
      id: "Annotation::@aws-cdk/aws-ecs:shouldUseCircuitBreaker",
      reason: "Blue/green deployments fail fast through lifecycle hooks and deployment alarms instead.",
    });
  }
}
