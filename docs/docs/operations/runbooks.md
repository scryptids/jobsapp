---
sidebar_position: 3
---

# Runbooks

Operational tasks are **SSM Automation runbooks**, defined in
`infra/lib/ops-stack.ts`. They have typed parameters, are allowed through IAM,
and are recorded in CloudTrail.

## Running a runbook

1. Assume the `jobsapp-operator` role. It requires MFA.
2. Start the runbook in one of two ways:
   - **Console:** Systems Manager → Automation → **Execute automation** →
     *Owned by me* → pick `jobsapp-…` → fill in the form → Execute.
   - **CLI:**

     ```sh
     aws ssm start-automation-execution \
       --document-name jobsapp-PointInTimeRestore \
       --parameters Timestamp=2026-11-15T10:30:00Z,Mode=dry-run
     aws ssm get-automation-execution --automation-execution-id <id>
     ```

Runbooks that touch data start a one-off ECS task running the ops CLI
(`app/src/ops/cli.ts`) from the deployed image. That task's output is a JSON
line in CloudWatch Logs, in the app log group under `ops/app/<task id>`. The
runbook fails if the task exits non-zero.

## Catalogue

| Runbook | Parameters | Use it when | What happens |
|---|---|---|---|
| `jobsapp-Status` | – | You want to know who's writing | Prints the control document: state, writer task, generation, lease. |
| `jobsapp-VerifyBackup` | – | Also runs daily at 04:30 UTC | Restores the latest generation to scratch, runs `integrity_check` and the migrations, and reports row counts. The `BackupNotVerified` alarm fires when it doesn't succeed. |
| `jobsapp-PointInTimeRestore` | `Timestamp` (UTC ISO), `Mode` = `dry-run` (default) \| `apply` | Data was deleted or corrupted | Restores the generation that was live at `Timestamp` as of that moment, checks and migrates it, and reports row counts. With `apply`, it takes the writer role (the app is read-only meanwhile), publishes the restored copy as a new generation and hands the role back. Older generations stay in S3, so you can undo by restoring to a later time. The restore point is precise to about 1–2 s, because Litestream timestamps each uploaded file. |
| `jobsapp-MaintenanceMode` | `Enabled` = `on` \| `off`, `Reason` | Before risky manual work | The writer switches to read-only (writes get 503) and keeps its lease. |
| `jobsapp-WriterHandoff` | `Reason` | A writer task looks unhealthy but is still running | The writer releases; another eligible task claims. With a single task, use `RestartService` instead. |
| `jobsapp-ExportDatabase` | `Timestamp` (or `latest`) | You need a copy for analysis or a support case | Writes `exports/<time>.db` to the replica bucket. Download it with your own credentials. Exports expire after 1 day. |
| `jobsapp-RestartService` | – | A task is wedged | Forces a new blue/green deployment of the same revision, including the handoff. |
| `jobsapp-RollbackDeployment` | `TaskDefinition` (`family:revision`) | Emergency: a release is bad and CI is slow or broken | Deploys that revision through blue/green. The next CDK deploy restores whatever CDK defines, so also revert the commit. |
| `jobsapp-RotateCookieSecret` | – | Regularly, or if a secret may have leaked | Prepends a new signing secret and keeps the previous two (nobody is signed out), then rolls the service. Run it three times to invalidate all existing sessions. |

### Downloading an export

```sh
aws s3 cp s3://<replica bucket>/exports/<time>.db ./jobsapp-export.db
sqlite3 jobsapp-export.db '.tables'
```

The file contains user data, including password hashes. Handle it as
sensitive, and delete it when you're done.

## Alarms

Alarms email the address in `jobsapp:alarmEmail` through SNS.

| Alarm | Meaning | First steps |
|---|---|---|
| `Target5xx` / `Elb5xx` | The app or ALB is returning errors. During a deploy this also triggers rollback. | Check the app logs and the ECS service events. |
| `ReplicationLag` | No successful Litestream sync for 15 min, or **no writer** (metric missing) | Run `Status`. If no task is the writer, run `RestartService`. |
| `BackupNotVerified` | The daily restore test failed or didn't run | Check the `ops/` logs, then run `VerifyBackup` by hand. |
| Budget | Spend passed 80% of the monthly budget, or is forecast to pass 100% | Open Cost Explorer. |

## Common situations

- **"The app says it's read-only."** Run `Status`. The state shows which case
  you're in:
  - `maintenance`: someone turned it on.
  - `handoff` or `released`: a deploy is in progress. If this lasts more than
    a few minutes, run `RestartService`.
  - `active` with an expired lease: the writer crashed, and a new task will
    claim within about a minute.
- **Deleted data by mistake.**
  1. Run `PointInTimeRestore` with `Mode=dry-run` and a timestamp just before
     the deletion. Check the row counts.
  2. Run it again with `Mode=apply`.

  Writes made after that timestamp are lost. Export first if you need to
  salvage them.
- **Region or bucket disaster.** The bucket is versioned and retained, but
  not replicated across regions; that's a cost choice. For off-site copies,
  schedule `ExportDatabase` and copy the result elsewhere.
