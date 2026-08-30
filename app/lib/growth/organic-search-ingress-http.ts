import type { NextRequest } from "next/server";
import { ORGANIC_SEARCH_INGRESS_MAX_BYTES } from "./organic-search-ingress";
import {
  ingressRequestError,
  ingressSameOrigin,
  privateIngressResponse,
  readBoundedIngressJson,
} from "./ingress-http";

// JSON escaping can nearly double quoted CSV fields. The transport remains
// bounded separately from the canonical UTF-8 CSV parser limit.
const MAX_REQUEST_BYTES = ORGANIC_SEARCH_INGRESS_MAX_BYTES * 2 + 16 * 1024;

export const privateOrganicSearchIngressResponse = privateIngressResponse;
export const organicSearchIngressSameOrigin = ingressSameOrigin;
export const organicSearchIngressRequestError = ingressRequestError;

export function readOrganicSearchIngressJson(request: NextRequest) {
  return readBoundedIngressJson(request, { maxRequestBytes: MAX_REQUEST_BYTES });
}
