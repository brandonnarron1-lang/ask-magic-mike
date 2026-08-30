import type { NextRequest } from "next/server";
import { LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES } from "./local-profile-performance-ingress";
import {
  ingressRequestError,
  ingressSameOrigin,
  privateIngressResponse,
  readBoundedIngressJson,
} from "./ingress-http";

// JSON escaping can nearly double quoted CSV fields. The transport remains
// bounded separately from the canonical UTF-8 CSV parser limit.
const MAX_REQUEST_BYTES = LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES * 2 + 16 * 1024;

export const privateLocalProfilePerformanceIngressResponse = privateIngressResponse;
export const localProfilePerformanceIngressSameOrigin = ingressSameOrigin;
export const localProfilePerformanceIngressRequestError = ingressRequestError;

export function readLocalProfilePerformanceIngressJson(request: NextRequest) {
  return readBoundedIngressJson(request, { maxRequestBytes: MAX_REQUEST_BYTES });
}
