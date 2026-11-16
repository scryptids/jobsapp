import path from "node:path";
import { fileURLToPath } from "node:url";

import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";

import { bundledCode } from "./bundle";
import type { Config } from "./config";

const here = path.dirname(fileURLToPath(import.meta.url));
const containerName = "app";
const containerPort = 8080;
export const testTrafficHeader = "x-jobsapp-test-traffic";

export type AppStackProps = StackProps & {
  config: Config;
  repository: ecr.IRepository;
  bucket: s3.IBucket;
  dataKey: kms.IKey;
};

/**
 * The running app: a single Fargate task behind an ALB, deployed with ECS
 * built-in blue/green. Cost-driven deviations from Well-Architected:
 * - public subnets with public IPs instead of private subnets + NAT
 *   (the task security group only admits the ALB);
 * - one task (SQLite has one writer), two AZs for the ALB only;
 * - no ALB access logs, no Container Insights.
 */
export class AppStack extends Stack {
  readonly cluster: ecs.Cluster;
  readonly service: ecs.FargateService;
  readonly taskDefinition: ecs.FargateTaskDefinition;
  readonly opsTaskDefinition: ecs.FargateTaskDefinition;
  readonly taskSecurityGroup: ec2.SecurityGroup;
  readonly vpc: ec2.Vpc;
  readonly cookieSecret: secretsmanager.Secret;
  readonly alarmTopic: sns.Topic;
  readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);
    const { config, repository, bucket, dataKey } = props;
    const appUrl = `https://${config.domainName}`;

    // --- Network ----------------------------------------------------------
    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
      // S3 traffic (replication) stays on the AWS network, free.
      gatewayEndpoints: { S3: { service: ec2.GatewayVpcEndpointAwsService.S3 } },
    });
    new ec2.FlowLog(this, "RejectedFlows", {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      trafficType: ec2.FlowLogTrafficType.REJECT,
      destination: ec2.FlowLogDestination.toCloudWatchLogs(
        new logs.LogGroup(this, "FlowLogs", {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: RemovalPolicy.DESTROY,
        })
      ),
    });

    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc: this.vpc,
      description: "Public HTTPS",
      allowAllOutbound: false,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP redirect");

    this.taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSg", {
      vpc: this.vpc,
      description: "App tasks: only the ALB may connect",
      allowAllOutbound: true, // ECR, S3, CloudWatch, Secrets Manager over HTTPS
    });
    this.taskSecurityGroup.addIngressRule(albSg, ec2.Port.tcp(containerPort), "ALB to nginx");
    albSg.addEgressRule(this.taskSecurityGroup, ec2.Port.tcp(containerPort), "to tasks");

    // --- DNS + TLS --------------------------------------------------------
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: config.hostedZoneId,
      zoneName: config.hostedZoneName,
    });
    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: config.domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // --- Load balancer ----------------------------------------------------
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: this.vpc,
      internetFacing: true,
      securityGroup: albSg,
      dropInvalidHeaderFields: true,
      idleTimeout: Duration.seconds(60),
    });
    alb.addRedirect({ sourcePort: 80, targetPort: 443 });

    const targetGroup = (name: string) =>
      new elbv2.ApplicationTargetGroup(this, name, {
        vpc: this.vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        deregistrationDelay: Duration.seconds(15),
        healthCheck: {
          path: "/healthz",
          healthyHttpCodes: "200",
          interval: Duration.seconds(10),
          timeout: Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      });
    const blueTg = targetGroup("BlueTg");
    const greenTg = targetGroup("GreenTg");

    const listener = alb.addListener("Https", {
      port: 443,
      certificates: [certificate],
      sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, { contentType: "text/plain", messageBody: "Not found" }),
    });

    // Test traffic: requests carrying the secret header reach the new
    // revision before production does. Only the deploy hook knows it.
    const testTrafficSecret = new secretsmanager.Secret(this, "TestTrafficSecret", {
      description: "Header value that routes a request to the green revision during deploys",
      generateSecretString: { passwordLength: 40, excludePunctuation: true },
    });
    const weighted = () =>
      elbv2.ListenerAction.weightedForward([
        { targetGroup: blueTg, weight: 100 },
        { targetGroup: greenTg, weight: 0 },
      ]);
    const testRule = new elbv2.ApplicationListenerRule(this, "TestRule", {
      listener,
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.httpHeader(testTrafficHeader, [
          testTrafficSecret.secretValue.unsafeUnwrap(),
        ]),
      ],
      action: weighted(),
    });
    const prodRule = new elbv2.ApplicationListenerRule(this, "ProdRule", {
      listener,
      priority: 10,
      conditions: [elbv2.ListenerCondition.hostHeaders([config.domainName])],
      action: weighted(),
    });

    new route53.ARecord(this, "AliasA", {
      zone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });

    // --- WAF --------------------------------------------------------------
    if (config.enableWaf) this.addWaf(alb);

    // --- Secrets ----------------------------------------------------------
    this.cookieSecret = new secretsmanager.Secret(this, "CookieSecrets", {
      description: "COOKIE_SECRETS: comma-separated, newest first (RotateCookieSecret runbook)",
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });

    // --- ECS --------------------------------------------------------------
    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc: this.vpc,
      containerInsightsV2: ecs.ContainerInsights.DISABLED,
    });

    this.logGroup = new logs.LogGroup(this, "AppLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const image = ecs.ContainerImage.fromEcrRepository(repository, config.imageTag);
    const environment = {
      NODE_ENV: "production",
      WRITER_COORDINATION: "s3",
      REPLICA_BUCKET: bucket.bucketName,
      REPLICA_PREFIX: "",
      AWS_REGION: this.region,
    };

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "jobsapp app and ops tasks",
    });
    // Litestream (replicate, restore, retention) + control document + exports.
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"],
        resources: [bucket.arnForObjects("*")],
      })
    );
    taskRole.addToPolicy(
      new iam.PolicyStatement({ actions: ["s3:ListBucket", "s3:GetBucketLocation"], resources: [bucket.bucketArn] })
    );
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"],
        resources: [dataKey.keyArn],
      })
    );

    const makeTaskDefinition = (name: string, cpu: number, memoryLimitMiB: number) => {
      const td = new ecs.FargateTaskDefinition(this, name, {
        cpu,
        memoryLimitMiB,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
        taskRole,
        volumes: [{ name: "data" }, { name: "tmp" }],
      });
      return td;
    };

    this.taskDefinition = makeTaskDefinition("TaskDef", 256, 1024);
    const container = this.taskDefinition.addContainer(containerName, {
      image,
      environment,
      secrets: { COOKIE_SECRETS: ecs.Secret.fromSecretsManager(this.cookieSecret) },
      logging: ecs.LogDrivers.awsLogs({ logGroup: this.logGroup, streamPrefix: "app" }),
      portMappings: [{ containerPort, name: "http" }],
      readonlyRootFilesystem: true,
      stopTimeout: Duration.seconds(120),
      healthCheck: {
        command: [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))",
        ],
        interval: Duration.seconds(15),
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(90),
        retries: 3,
      },
    });
    container.addMountPoints(
      { containerPath: "/data", sourceVolume: "data", readOnly: false },
      { containerPath: "/tmp", sourceVolume: "tmp", readOnly: false }
    );

    // One-off operator tasks (runbooks): same image and role, more memory.
    this.opsTaskDefinition = makeTaskDefinition("OpsTaskDef", 512, 2048);
    const opsContainer = this.opsTaskDefinition.addContainer(containerName, {
      image,
      environment: { ...environment, TASK_DEFINITION: "ops:runbook" },
      command: ["ops", "status"],
      logging: ecs.LogDrivers.awsLogs({ logGroup: this.logGroup, streamPrefix: "ops" }),
      readonlyRootFilesystem: true,
    });
    opsContainer.addMountPoints(
      { containerPath: "/data", sourceVolume: "data", readOnly: false },
      { containerPath: "/tmp", sourceVolume: "tmp", readOnly: false }
    );

    // --- Alarms -----------------------------------------------------------
    this.alarmTopic = new sns.Topic(this, "Alarms", {
      displayName: "jobsapp alarms",
      enforceSSL: true,
    });
    if (config.alarmEmail) this.alarmTopic.addSubscription(new subs.EmailSubscription(config.alarmEmail));
    const notify = new cwActions.SnsAction(this.alarmTopic);

    const target5xx = new cloudwatch.Alarm(this, "Target5xx", {
      alarmDescription: "App returned 5xx responses (also rolls back a deploy during bake)",
      metric: alb.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, {
        period: Duration.minutes(1),
        statistic: "Sum",
      }),
      threshold: 5,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    const elb5xx = new cloudwatch.Alarm(this, "Elb5xx", {
      alarmDescription: "ALB itself returned 5xx (no healthy target?)",
      metric: alb.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, {
        period: Duration.minutes(1),
        statistic: "Sum",
      }),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    const replicationLag = new cloudwatch.Alarm(this, "ReplicationLag", {
      alarmDescription:
        "No successful Litestream sync recently, or no task is the writer (metric missing)",
      metric: new cloudwatch.Metric({
        namespace: "Jobsapp",
        metricName: "SecondsSinceReplicaSync",
        statistic: "Maximum",
        period: Duration.minutes(5),
      }),
      threshold: 900,
      evaluationPeriods: 3,
      datapointsToAlarm: 3,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    for (const alarm of [target5xx, elb5xx, replicationLag]) {
      alarm.addAlarmAction(notify);
      alarm.addOkAction(notify);
    }

    // --- Service (blue/green) --------------------------------------------
    this.service = new ecs.FargateService(this, "Service", {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: true, // no NAT gateway (cost); SG blocks inbound
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [this.taskSecurityGroup],
      healthCheckGracePeriod: Duration.seconds(120),
      deploymentStrategy: ecs.DeploymentStrategy.BLUE_GREEN,
      bakeTime: Duration.minutes(10),
      deploymentAlarms: {
        alarmNames: [target5xx.alarmName, elb5xx.alarmName],
        behavior: ecs.AlarmBehavior.ROLLBACK_ON_ALARM,
      },
      enableExecuteCommand: false,
      propagateTags: ecs.PropagatedTagSource.SERVICE,
    });

    const lbTarget = this.service.loadBalancerTarget({
      containerName,
      containerPort,
      alternateTarget: new ecs.AlternateTarget("Green", {
        alternateTargetGroup: greenTg,
        productionListener: ecs.ListenerRuleConfiguration.applicationListenerRule(prodRule),
        testListener: ecs.ListenerRuleConfiguration.applicationListenerRule(testRule),
      }),
    });
    lbTarget.attachToApplicationTargetGroup(blueTg);

    // --- Deploy hook (writer handoff) ------------------------------------
    const hook = new lambda.Function(this, "DeployHook", {
      code: bundledCode(path.join(here, "../lambda/deploy-hook.ts")),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(60),
      memorySize: 256,
      environment: {
        REPLICA_BUCKET: bucket.bucketName,
        REPLICA_PREFIX: "",
        APP_URL: appUrl,
        TEST_TRAFFIC_SECRET_ARN: testTrafficSecret.secretArn,
      },
      logGroup: new logs.LogGroup(this, "DeployHookLogs", {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });
    hook.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [bucket.arnForObjects("control/*")],
      })
    );
    hook.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["kms:Decrypt", "kms:GenerateDataKey"], resources: [dataKey.keyArn] })
    );
    testTrafficSecret.grantRead(hook);
    hook.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["ecs:DescribeServiceRevisions"], resources: ["*"] })
    );

    this.service.addLifecycleHook(
      new ecs.DeploymentLifecycleLambdaTarget(hook, "WriterHandoff", {
        lifecycleStages: [
          ecs.DeploymentLifecycleStage.POST_TEST_TRAFFIC_SHIFT,
          // Not yet in the CDK enum, but a valid ECS stage: production
          // traffic is still entirely on blue.
          "PRE_PRODUCTION_TRAFFIC_SHIFT" as ecs.DeploymentLifecycleStage,
          ecs.DeploymentLifecycleStage.PRODUCTION_TRAFFIC_SHIFT,
          ecs.DeploymentLifecycleStage.POST_PRODUCTION_TRAFFIC_SHIFT,
        ],
      })
    );
  }

  private addWaf(alb: elbv2.ApplicationLoadBalancer) {
    const managed = (name: string, priority: number) => ({
      name,
      priority,
      overrideAction: { none: {} },
      statement: { managedRuleGroupStatement: { vendorName: "AWS", name } },
      visibilityConfig: { sampledRequestsEnabled: true, cloudWatchMetricsEnabled: true, metricName: name },
    });
    const acl = new wafv2.CfnWebACL(this, "WebAcl", {
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: { sampledRequestsEnabled: true, cloudWatchMetricsEnabled: true, metricName: "jobsapp" },
      rules: [
        {
          name: "LoginRateLimit",
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 20,
              evaluationWindowSec: 300,
              aggregateKeyType: "IP",
              scopeDownStatement: {
                byteMatchStatement: {
                  fieldToMatch: { uriPath: {} },
                  positionalConstraint: "STARTS_WITH",
                  searchString: "/login",
                  textTransformations: [{ priority: 0, type: "LOWERCASE" }],
                },
              },
            },
          },
          visibilityConfig: { sampledRequestsEnabled: true, cloudWatchMetricsEnabled: true, metricName: "LoginRateLimit" },
        },
        {
          name: "GlobalRateLimit",
          priority: 1,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: 2000, evaluationWindowSec: 300, aggregateKeyType: "IP" } },
          visibilityConfig: { sampledRequestsEnabled: true, cloudWatchMetricsEnabled: true, metricName: "GlobalRateLimit" },
        },
        managed("AWSManagedRulesCommonRuleSet", 2),
        managed("AWSManagedRulesKnownBadInputsRuleSet", 3),
      ],
    });
    new wafv2.CfnWebACLAssociation(this, "WebAclAssociation", {
      resourceArn: alb.loadBalancerArn,
      webAclArn: acl.attrArn,
    });
  }
}
