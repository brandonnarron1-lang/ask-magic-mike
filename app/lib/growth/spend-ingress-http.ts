import type { NextRequest } from "next/server";
import { SPEND_INGRESS_MAX_BYTES } from "./spend-ingress";
import {
  ingressRequestError,
  ingressSameOrigin,
  privateIngressResponse,
  readBoundedIngressJson,
} from "./ingress-http";

// JSON escaping can nearly double an otherwise valid CSV (for example, quoted
// fields and line breaks). Keep the transport bounded without rejecting a CSV
// that is still inside the canonical parser limit.
const MAX_REQUEST_BYTES = SPEND_INGRESS_MAX_BYTES * 2 + 8 * 1024;
export const privateSpendIngressResponse = privateIngressResponse;

export function spendIngressSameOrigin(request: NextRequest) {
  return ingressSameOrigin(request);
}

export async function readSpendIngressJson(request: NextRequest) {
  return readBoundedIngressJson(request, { maxRequestBytes: MAX_REQUEST_BYTES });
}

export const spendIngressRequestError = ingressRequestError;
