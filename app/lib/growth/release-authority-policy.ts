import authorityPolicy from "../../../config/release-authority-policy.json";

interface ApplicationReleaseCandidate {
  pr: number;
  url: string;
  branch: string;
  reviewedHead: string;
  tree: string;
  state: "reviewed" | "ready_for_owner_approval";
  approvalGate: string;
}

interface ApplicationReviewVehicle {
  pr: number;
  url: string;
  branch: string;
  baseCommit: string;
  implementationHead: string;
  state: "draft_unsealed" | "sealed_for_owner_approval";
  migrationCount: number;
  externalMutationCount: number;
}

export interface ReleaseAuthorityPolicy {
  schemaVersion: 1;
  updatedAt: string;
  repository: string;
  authorityModel: {
    policy: "source_authored";
    candidate: "review_time_only";
    acceptedProduction: "deployment_generated_receipt";
    resolver: "authenticated_fail_closed";
  };
  productionTarget: {
    githubEnvironment: "Production";
    vercelTeam: string;
    vercelProject: string;
    vercelProjectId: string;
    canonicalUrl: string;
  };
  receiptStore: {
    kind: "github_release_asset";
    tagPrefix: string;
    assetName: string;
    checksumAssetName: string;
    retention: string;
    bootstrap: {
      kind: "github_pr_comment";
      pr: number;
      commentId: number;
      url: string;
      acceptedMergeCommit: string;
      status: "accepted_historical_bootstrap";
    };
  };
  candidate: ApplicationReleaseCandidate | null;
  reviewVehicle: ApplicationReviewVehicle | null;
  approvalPolicy: {
    exactReviewedHeadRequired: true;
    exactTreeRequired: true;
    immutablePreviewRequired: true;
    hostedReleaseGateRequired: true;
    productionVerificationRequired: true;
    historicalApprovalReplayAllowed: false;
    automaticExternalMutationMaximum: 0;
  };
  historicalApplicationReleases: Array<{
    pr: number;
    mergeCommit: string;
    tree: string;
    deploymentId: string;
    status: string;
    receiptUrl?: string;
  }>;
  consumedApprovals: Array<{
    pr: number;
    phrase: string;
    consumedAt: string;
  }>;
  releasedCutover: {
    pr: number;
    status: "applied_and_verified";
    migrations: Array<{ version: string; file: string; sha256: string }>;
  };
  consolidatedComponentTrain: {
    firstPr: number;
    lastPr: number;
    disposition: "historical_lineage_no_independent_release_authority";
  };
}

export const RELEASE_AUTHORITY_POLICY = authorityPolicy as ReleaseAuthorityPolicy;

// Runtime code consumes only source-local candidate policy. Accepted Production
// is deliberately resolved by operator tooling from a deployment-generated
// receipt; customer-facing requests never depend on GitHub or Vercel APIs.
export const CURRENT_APPLICATION_RELEASE_GATE =
  RELEASE_AUTHORITY_POLICY.candidate?.approvalGate ?? null;
