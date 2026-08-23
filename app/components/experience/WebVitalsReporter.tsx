"use client";

import { useReportWebVitals } from "next/web-vitals";

import {
  isKnownInternalQaAttribution,
  isKnownInternalQaSearch,
  normalizePublicExperienceRoute,
  normalizeWebVitalEventProperties,
} from "../../lib/experience/web-vitals";

const CANONICAL_HOSTS = new Set(["askmagicmike.com", "www.askmagicmike.com"]);
const ATTRIBUTION_STORAGE_KEY = "amm_attribution";
const TRAFFIC_CLASS_STORAGE_KEY = "amm_experience_traffic_class";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

function isInternalQaSession() {
  try {
    if (window.sessionStorage.getItem(TRAFFIC_CLASS_STORAGE_KEY) === "internal_qa") return true;
    const rawAttribution = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const internalQa = isKnownInternalQaSearch(window.location.search) ||
      (rawAttribution && rawAttribution.length <= 8_192
        ? isKnownInternalQaAttribution(JSON.parse(rawAttribution))
        : false);
    if (internalQa) window.sessionStorage.setItem(TRAFFIC_CLASS_STORAGE_KEY, "internal_qa");
    return internalQa;
  } catch {
    return isKnownInternalQaSearch(window.location.search);
  }
}

const reportWebVital: ReportWebVitalsCallback = (metric) => {
  if (typeof window === "undefined" || !CANONICAL_HOSTS.has(window.location.hostname)) return;
  if (navigator.webdriver || isInternalQaSession()) return;
  const route = normalizePublicExperienceRoute(window.location.pathname);
  if (!route) return;
  const properties = normalizeWebVitalEventProperties({
    metric_name: metric.name,
    metric_id: metric.id,
    metric_value: metric.value,
    rating: metric.rating,
    navigation_type: metric.navigationType,
    route,
    device_category: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    traffic_class: "public_production",
  });
  if (!properties) return;

  void window.fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_name: "web_vital_observed", properties }),
    keepalive: true,
  }).catch(() => undefined);
};

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
