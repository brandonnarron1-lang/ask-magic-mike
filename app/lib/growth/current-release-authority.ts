import authorityManifest from "../../../config/current-release-authority.json";

export interface CurrentReleaseAuthorityManifest {
  schemaVersion: number;
  updatedAt: string;
  production: {
    pr: number;
    mergeCommit: string;
    deploymentId: string;
  };
  candidate: {
    pr: number;
    url: string;
    branch: string;
    head: string;
    tree: string;
    state: "draft";
    approvalGate: string;
    cutoverCommand: string;
    rescueBranch: string;
    releaseGate: {
      runId: number;
      url: string;
      status: "success";
    };
    preview: {
      deploymentId: string;
      url: string;
      target: "preview";
      status: "ready";
    };
    previewQa: {
      runId: number;
      url: string;
      safeDbWrite: false;
      previewIdentityConfirmed: true;
      productionEndpointRejected: true;
      providerDeliveryDisabled: true;
      status: "success";
    };
    controlledMutationProof: {
      status: "verified_reused_unchanged_surface";
      evidencePath: string;
      applicationCommit: string;
      surfaceSha256: string;
      surfaceFiles: string[];
      migrationVersion: string;
      migrationSha256: string;
      previewIdentityConfirmed: true;
      providerDeliveryDisabled: true;
      durableReadback: true;
      idempotencyVerified: true;
      terminalTestCloseoutVerified: true;
    };
    migrations: Array<{
      version: string;
      file: string;
      sha256: string;
    }>;
  };
  consolidatedComponentTrain: {
    firstPr: number;
    lastPr: number;
    disposition: "historical_lineage_no_independent_release_authority";
  };
  dependentReviewArtifacts: Array<{
    pr: number;
    url: string;
    branch: string;
    head: string;
    disposition: "post_candidate_read_only_operator_tooling";
  }>;
}

export const CURRENT_RELEASE_AUTHORITY =
  authorityManifest as CurrentReleaseAuthorityManifest;

export const CURRENT_CUMULATIVE_RELEASE_GATE =
  CURRENT_RELEASE_AUTHORITY.candidate.approvalGate;
