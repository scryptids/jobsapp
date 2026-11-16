import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

import type { Config } from "./config";

/**
 * Stateful resources, kept apart from the app stack so the app can be torn
 * down and recreated without touching data. Everything here is retained on
 * stack deletion and the stack has termination protection.
 *
 * The bucket holds the writer control document, the Litestream replica
 * generations, generation history and operator exports.
 */
export class DataStack extends Stack {
  readonly bucket: s3.Bucket;
  readonly key: kms.Key;

  constructor(scope: Construct, id: string, config: Config, props?: StackProps) {
    super(scope, id, { ...props, terminationProtection: true });

    this.key = new kms.Key(this, "DataKey", {
      alias: `alias/${config.appName}-data`,
      description: "Encrypts the jobsapp database replicas",
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.bucket = new s3.Bucket(this, "ReplicaBucket", {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.key,
      bucketKeyEnabled: true, // far fewer KMS calls (cost)
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      minimumTLSVersion: 1.2,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "expire-old-versions",
          noncurrentVersionExpiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(2),
        },
        // No age-based expiry under db/: if the database sat idle, the live
        // generation's only snapshot could be old. Litestream's retention
        // prunes inside a generation; old generations are small and kept.
        { id: "expire-exports", prefix: "exports/", expiration: Duration.days(1) },
      ],
    });

    // Nobody but the account root may delete object versions or turn
    // versioning off; lifecycle rules still expire old versions.
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "ProtectHistory",
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:DeleteObjectVersion", "s3:PutBucketVersioning", "s3:PutLifecycleConfiguration"],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects("*")],
        conditions: {
          ArnNotLike: {
            "aws:PrincipalArn": [
              `arn:${this.partition}:iam::${this.account}:root`,
              `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-cfn-exec-role-*`,
            ],
          },
        },
      })
    );
  }
}
