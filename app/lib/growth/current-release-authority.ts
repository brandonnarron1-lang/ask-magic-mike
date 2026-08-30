import authorityManifest from "../../../config/current-release-authority.json";

interface ReleaseGateReceipt {
  runId: number;
  url: string;
  status: "success";
}

interface ReleaseMigrationReceipt {
  version: string;
  file: string;
  sha256: string;
}

interface ApplicationReleaseCandidate {
  pr: number;
  url: string;
  branch: string;
  head: string;
  tree: string;
  state: "draft";
  approvalGate: string;
}

interface ControlledMutationProof {
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
}

export interface CurrentReleaseAuthorityManifest {
  schemaVersion: 4;
  updatedAt: string;
  production: {
    pr: number;
    reviewedHead: string;
    mergeCommit: string;
    tree: string;
    deploymentId: string;
    status: "accepted";
    rollbackDeploymentId: string;
    releaseGate: ReleaseGateReceipt;
  };
  candidate: ApplicationReleaseCandidate | null;
  releasedCutover: {
    pr: number;
    url: string;
    branch: string;
    reviewedHead: string;
    tree: string;
    mergeCommit: string;
    deploymentId: string;
    status: "applied_and_verified";
    approval: {
      phrase: string;
      status: "consumed";
      consumedAt: string;
    };
    cutoverCommand: string;
    rescueBranch: string;
    releaseGate: ReleaseGateReceipt;
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
    controlledMutationProof: ControlledMutationProof;
    migrations: ReleaseMigrationReceipt[];
    productionTarget: {
      provider: "neon";
      project: string;
      branch: string;
      endpoint: string;
      database: string;
    };
    importGates: {
      marketingSpend: false;
      organicSearch: false;
      localProfilePerformance: false;
    };
    backupReceipt: {
      sha256: string;
      sizeBytes: number;
      restoreEntries: number;
      retention: "retained_mode_600";
    };
    postflight: {
      migrationLedgerRowsPerVersion: 1;
      receiptRows: 0;
      existingCountsUnchanged: true;
      privilegeChecksPassed: true;
      healthChecksPassed: true;
    };
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

// Null is deliberate: a consumed release receipt must never become a reusable gate.
export const CURRENT_APPLICATION_RELEASE_GATE =
  CURRENT_RELEASE_AUTHORITY.candidate?.approvalGate ?? null;
