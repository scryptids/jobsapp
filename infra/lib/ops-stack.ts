import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import type * as kms from "aws-cdk-lib/aws-kms";
import type * as logs from "aws-cdk-lib/aws-logs";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

import type { Config } from "./config";

export type OpsStackProps = StackProps & {
  config: Config;
  cluster: ecs.ICluster;
  service: ecs.FargateService;
  opsTaskDefinition: ecs.FargateTaskDefinition;
  vpc: ec2.IVpc;
  taskSecurityGroup: ec2.ISecurityGroup;
  cookieSecret: secretsmanager.ISecret;
  alarmTopic: sns.ITopic;
  logGroup: logs.ILogGroup;
  bucket: s3.IBucket;
  dataKey: kms.IKey;
};

const isoTimestamp = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?Z$";

/**
 * Operator playbooks as SSM Automation runbooks, plus scheduled backup
 * verification, the budget alarm and the operator role.
 *
 * Run a runbook from the console (Systems Manager → Automation → Execute
 * automation → Owned by me) or the CLI:
 *
 *   aws ssm start-automation-execution --document-name jobsapp-PointInTimeRestore \
 *     --parameters Timestamp=2026-11-15T10:30:00Z,Mode=dry-run
 *
 * Runbooks that touch data run the ops CLI (`app/src/ops/cli.ts`) as a
 * one-off ECS task from the same image; its output is in the app log group
 * under the `ops/` prefix.
 */
export class OpsStack extends Stack {
  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);
    const { config, cluster, service, opsTaskDefinition, vpc, taskSecurityGroup } = props;
    const prefix = config.appName;
    const subnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }).subnetIds;

    // --- Automation role (what runbooks may do) ---------------------------
    const automationRole = new iam.Role(this, "AutomationRole", {
      assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
      description: "Assumed by the jobsapp SSM Automation runbooks",
    });
    const taskDefinitionFamilyArn = `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/${opsTaskDefinition.family}:*`;
    automationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecs:RunTask"],
        resources: [taskDefinitionFamilyArn],
        conditions: { ArnEquals: { "ecs:cluster": cluster.clusterArn } },
      })
    );
    automationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecs:DescribeTasks"],
        resources: [`arn:${this.partition}:ecs:${this.region}:${this.account}:task/${cluster.clusterName}/*`],
      })
    );
    automationRole.addToPolicy(
      new iam.PolicyStatement({ actions: ["ecs:UpdateService", "ecs:DescribeServices"], resources: [service.serviceArn] })
    );
    automationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [opsTaskDefinition.taskRole.roleArn, opsTaskDefinition.obtainExecutionRole().roleArn],
      })
    );
    props.cookieSecret.grantRead(automationRole);
    props.cookieSecret.grantWrite(automationRole);

    const doc = (name: string, description: string, content: Record<string, unknown>) =>
      new ssm.CfnDocument(this, name, {
        name: `${prefix}-${name}`,
        documentType: "Automation",
        documentFormat: "JSON",
        updateMethod: "NewVersion",
        content: {
          schemaVersion: "0.3",
          description,
          assumeRole: automationRole.roleArn,
          ...content,
        },
      });

    /** Steps: run the ops CLI as a one-off task, wait, require exit code 0. */
    const opsTaskSteps = (command: string[]) => [
      {
        name: "runOpsTask",
        action: "aws:executeAwsApi",
        inputs: {
          Service: "ecs",
          Api: "RunTask",
          cluster: cluster.clusterArn,
          taskDefinition: opsTaskDefinition.family,
          launchType: "FARGATE",
          startedBy: "ssm-automation",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets,
              securityGroups: [taskSecurityGroup.securityGroupId],
              assignPublicIp: "ENABLED",
            },
          },
          overrides: { containerOverrides: [{ name: "app", command: ["ops", ...command] }] },
        },
        outputs: [{ Name: "TaskArn", Selector: "$.tasks[0].taskArn", Type: "String" }],
      },
      {
        name: "waitForTask",
        action: "aws:waitForAwsResourceProperty",
        timeoutSeconds: 1800,
        inputs: {
          Service: "ecs",
          Api: "DescribeTasks",
          cluster: cluster.clusterArn,
          tasks: ["{{ runOpsTask.TaskArn }}"],
          PropertySelector: "$.tasks[0].lastStatus",
          DesiredValues: ["STOPPED"],
        },
      },
      {
        name: "requireSuccess",
        action: "aws:assertAwsResourceProperty",
        description: `On failure, read the task's log stream: ${props.logGroup.logGroupName} → ops/app/<task id>`,
        inputs: {
          Service: "ecs",
          Api: "DescribeTasks",
          cluster: cluster.clusterArn,
          tasks: ["{{ runOpsTask.TaskArn }}"],
          PropertySelector: "$.tasks[0].containers[0].exitCode",
          DesiredValues: ["0"],
        },
        isEnd: true,
      },
    ];
    const opsOutputs = { outputs: ["runOpsTask.TaskArn"] };

    doc("Status", "Show the writer control document (who writes, which generation).", {
      mainSteps: opsTaskSteps(["status"]),
      ...opsOutputs,
    });

    doc("VerifyBackup", "Restore the latest replica to scratch, integrity-check it and dry-run migrations.", {
      mainSteps: opsTaskSteps(["verify"]),
      ...opsOutputs,
    });

    doc(
      "PointInTimeRestore",
      "Restore the database to a moment in time. dry-run restores and checks a copy only; apply makes it live (the app is read-only for the duration). Undo by restoring again to a later time.",
      {
        parameters: {
          Timestamp: {
            type: "String",
            description: "UTC time to restore to, e.g. 2026-11-15T10:30:00Z",
            allowedPattern: isoTimestamp,
          },
          Mode: { type: "String", default: "dry-run", allowedValues: ["dry-run", "apply"] },
        },
        mainSteps: opsTaskSteps(["restore", "--timestamp", "{{ Timestamp }}", "--mode", "{{ Mode }}"]),
        ...opsOutputs,
      }
    );

    doc("MaintenanceMode", "Put the app in read-only maintenance mode, or take it out.", {
      parameters: {
        Enabled: { type: "String", allowedValues: ["on", "off"] },
        Reason: { type: "String", default: "maintenance", allowedPattern: "^[\\w .,:()-]{1,120}$" },
      },
      mainSteps: opsTaskSteps(["maintenance", "{{ Enabled }}", "--reason", "{{ Reason }}"]),
      ...opsOutputs,
    });

    doc("WriterHandoff", "Ask the current writer to release; the next eligible task becomes the writer.", {
      parameters: {
        Reason: { type: "String", default: "operator handoff", allowedPattern: "^[\\w .,:()-]{1,120}$" },
      },
      mainSteps: opsTaskSteps(["handoff", "--reason", "{{ Reason }}"]),
      ...opsOutputs,
    });

    doc(
      "ExportDatabase",
      "Write a copy of the database (latest, or as of Timestamp) to exports/ in the replica bucket. Download it with your own credentials; exports expire after a day.",
      {
        parameters: {
          Timestamp: {
            type: "String",
            default: "latest",
            description: "UTC time, or 'latest'",
            allowedPattern: `^(latest|${isoTimestamp.slice(1, -1)})$`,
          },
        },
        mainSteps: [
          {
            name: "chooseMode",
            action: "aws:branch",
            inputs: {
              Choices: [{ NextStep: "runOpsTask", Variable: "{{ Timestamp }}", StringEquals: "latest" }],
              Default: "runOpsTaskAt",
            },
          },
          ...opsTaskSteps(["export"]),
          ...opsTaskSteps(["export", "--timestamp", "{{ Timestamp }}"]).map((step) => ({
            ...step,
            name: `${step.name}At`,
            inputs: JSON.parse(JSON.stringify(step.inputs).replaceAll("runOpsTask.", "runOpsTaskAt.")),
          })),
        ],
      }
    );

    doc("RestartService", "Force a new blue/green deployment of the current revision.", {
      mainSteps: [
        {
          name: "forceNewDeployment",
          action: "aws:executeAwsApi",
          inputs: {
            Service: "ecs",
            Api: "UpdateService",
            cluster: cluster.clusterArn,
            service: service.serviceName,
            forceNewDeployment: true,
          },
          isEnd: true,
        },
      ],
    });

    doc(
      "RollbackDeployment",
      "Emergency rollback: deploy an earlier task definition revision through blue/green. The next CDK deploy restores the revision CDK defines; for a lasting rollback, revert the commit.",
      {
        parameters: {
          TaskDefinition: {
            type: "String",
            description: "family:revision (aws ecs list-task-definitions --family-prefix <family>)",
            allowedPattern: "^[A-Za-z0-9_-]+:\\d+$",
          },
        },
        mainSteps: [
          {
            name: "deployRevision",
            action: "aws:executeAwsApi",
            inputs: {
              Service: "ecs",
              Api: "UpdateService",
              cluster: cluster.clusterArn,
              service: service.serviceName,
              taskDefinition: "{{ TaskDefinition }}",
            },
            isEnd: true,
          },
        ],
      }
    );
    automationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [service.taskDefinition.taskRole.roleArn, service.taskDefinition.obtainExecutionRole().roleArn],
      })
    );

    doc(
      "RotateCookieSecret",
      "Prepend a new cookie-signing secret (the previous two still verify, so nobody is signed out) and roll the service.",
      {
        mainSteps: [
          {
            name: "prependSecret",
            action: "aws:executeScript",
            inputs: {
              Runtime: "python3.11",
              Handler: "handler",
              InputPayload: { SecretId: props.cookieSecret.secretArn },
              Script: [
                "import boto3, secrets",
                "def handler(event, context):",
                "    sm = boto3.client('secretsmanager')",
                "    current = sm.get_secret_value(SecretId=event['SecretId'])['SecretString']",
                "    keep = [s for s in current.split(',') if s][:2]",
                "    sm.put_secret_value(SecretId=event['SecretId'], SecretString=','.join([secrets.token_urlsafe(36)] + keep))",
                "    return {'secrets': 1 + len(keep)}",
              ].join("\n"),
            },
          },
          {
            name: "rollService",
            action: "aws:executeAwsApi",
            inputs: {
              Service: "ecs",
              Api: "UpdateService",
              cluster: cluster.clusterArn,
              service: service.serviceName,
              forceNewDeployment: true,
            },
            isEnd: true,
          },
        ],
      }
    );

    // --- Daily backup verification ---------------------------------------
    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecs:RunTask"],
        resources: [taskDefinitionFamilyArn],
        conditions: { ArnEquals: { "ecs:cluster": cluster.clusterArn } },
      })
    );
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [opsTaskDefinition.taskRole.roleArn, opsTaskDefinition.obtainExecutionRole().roleArn],
      })
    );
    new scheduler.CfnSchedule(this, "DailyVerify", {
      description: "Restore-test the latest replica every day",
      scheduleExpression: "cron(30 4 * * ? *)",
      flexibleTimeWindow: { mode: "FLEXIBLE", maximumWindowInMinutes: 60 },
      target: {
        arn: cluster.clusterArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ containerOverrides: [{ name: "app", command: ["ops", "verify"] }] }),
        ecsParameters: {
          // Unqualified ARN: always the latest revision.
          taskDefinitionArn: `arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/${opsTaskDefinition.family}`,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets,
              securityGroups: [taskSecurityGroup.securityGroupId],
              assignPublicIp: "ENABLED",
            },
          },
        },
        retryPolicy: { maximumRetryAttempts: 2 },
      },
    });
    const verified = new cloudwatch.Alarm(this, "BackupNotVerified", {
      alarmDescription: "The daily restore test did not succeed",
      metric: new cloudwatch.Metric({
        namespace: "Jobsapp",
        metricName: "BackupVerified",
        statistic: "Sum",
        period: Duration.days(1),
      }),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    verified.addAlarmAction(new cwActions.SnsAction(props.alarmTopic));

    // --- Budget -----------------------------------------------------------
    if (config.alarmEmail) {
      new budgets.CfnBudget(this, "MonthlyBudget", {
        budget: {
          budgetName: `${prefix}-monthly`,
          budgetType: "COST",
          timeUnit: "MONTHLY",
          budgetLimit: { amount: config.monthlyBudgetUsd, unit: "USD" },
        },
        notificationsWithSubscribers: [
          {
            notification: { notificationType: "ACTUAL", comparisonOperator: "GREATER_THAN", threshold: 80 },
            subscribers: [{ subscriptionType: "EMAIL", address: config.alarmEmail }],
          },
          {
            notification: { notificationType: "FORECASTED", comparisonOperator: "GREATER_THAN", threshold: 100 },
            subscribers: [{ subscriptionType: "EMAIL", address: config.alarmEmail }],
          },
        ],
      });
    }

    // --- Operator role ----------------------------------------------------
    // Humans assume this (with MFA) to run runbooks and read their output.
    const operator = new iam.Role(this, "OperatorRole", {
      roleName: `${prefix}-operator`,
      assumedBy: new iam.AccountPrincipal(this.account).withConditions({
        Bool: { "aws:MultiFactorAuthPresent": "true" },
      }),
      maxSessionDuration: Duration.hours(4),
      description: "Run jobsapp runbooks and read their output",
    });
    operator.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:StartAutomationExecution"],
        resources: [`arn:${this.partition}:ssm:${this.region}:${this.account}:automation-definition/${prefix}-*`],
      })
    );
    operator.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ssm:GetAutomationExecution",
          "ssm:DescribeAutomationExecutions",
          "ssm:DescribeAutomationStepExecutions",
          "ssm:StopAutomationExecution",
          "ssm:ListDocuments",
          "ssm:DescribeDocument",
          "ssm:GetDocument",
          "ecs:ListTaskDefinitions",
          "ecs:DescribeServices",
          "ecs:ListServiceDeployments",
          "ecs:DescribeServiceDeployments",
          "cloudwatch:DescribeAlarms",
        ],
        resources: ["*"],
      })
    );
    operator.addToPolicy(
      new iam.PolicyStatement({ actions: ["iam:PassRole"], resources: [automationRole.roleArn] })
    );
    props.logGroup.grantRead(operator);
    operator.addToPolicy(
      new iam.PolicyStatement({ actions: ["s3:GetObject"], resources: [props.bucket.arnForObjects("exports/*")] })
    );
    props.dataKey.grantDecrypt(operator);
  }
}
