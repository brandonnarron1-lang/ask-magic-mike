import authorityManifest from "../../../config/current-release-authority.json";

interface SuccessfulRunReceipt {
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
  reviewedHead: string;
  tree: string;
  state: "reviewed";
  approvalGate: string;
}

export interface CurrentReleaseAuthorityManifest {
  schemaVersion: 6;
  updatedAt: string;
  production: {
    pr: number;
    reviewedHead: string;
    mergeCommit: string;
    tree: string;
    deploymentId: string;
    generatedUrl: string;
    canonicalUrl: string;
    status: "accepted";
    rollbackDeploymentId: string;
    releaseGate: SuccessfulRunReceipt;
    postDeployVerification: SuccessfulRunReceipt;
    productionMonitorRuns: SuccessfulRunReceipt[];
    runtimeRedeploy: {
      approval: {
        phrase: string;
        status: "consumed";
        consumedAt: string;
      };
      sourceDeploymentId: string;
      deploymentId: string;
      generatedUrl: string;
      reason: "production_database_url_replacement";
      target: {
        provider: "neon";
        project: string;
        branch: string;
        database: string;
        role: "service_role";
        connectionPooling: true;
      };
      migrationCount: 0;
      databaseWriteCount: 0;
      verification: {
        checkedAt: string;
        monitorStatus: "passed";
        monitorPassed: number;
        monitorFailed: 0;
        smokePassed: number;
        smokeSkipped: number;
        smokeFailed: 0;
        runtimeErrorCount: 0;
        readinessStatus: 200;
      };
    };
  };
  candidate: ApplicationReleaseCandidate | null;
  reviewVehicle: {
    pr: number;
    url: string;
    branch: string;
    baseCommit: string;
    implementationHead: string;
    state: "sealed_for_owner_approval";
    migrationCount: 0;
    externalMutationCount: 0;
  };
  releasedCutover: {
    pr: number;
    url: string;
    reviewedHead: string;
    mergeCommit: string;
    tree: string;
    deploymentId: string;
    status: "applied_and_verified";
    approval: {
      phrase: string;
      status: "consumed";
      consumedAt: string;
    };
    migrations: ReleaseMigrationReceipt[];
    productionTarget: {
      provider: "neon";
      project: string;
      branch: string;
      database: string;
    };
    importGates: {
      marketingSpend: false;
      organicSearch: false;
      localProfilePerformance: false;
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
  supersededReviewArtifacts: Array<{
    pr: number;
    url: string;
    disposition:
      | "superseded_by_pr247_mainline_reconciliation"
      | "superseded_by_pr247_mainline_port";
  }>;
}

export const CURRENT_RELEASE_AUTHORITY =
  authorityManifest as CurrentReleaseAuthorityManifest;

// Only the singular exact-tree reviewed candidate may expose an application
// release gate. WordPress publication and every other external action remain
// independent gates.
export const CURRENT_APPLICATION_RELEASE_GATE =
  CURRENT_RELEASE_AUTHORITY.candidate?.approvalGate ?? null;
