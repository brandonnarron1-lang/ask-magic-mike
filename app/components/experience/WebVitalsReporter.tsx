"use client";

import { useReportWebVitals } from "next/web-vitals";

import {
  normalizePublicExperienceRoute,
  normalizeWebVitalEventProperties,
  isKnownInternalQaSearch,
} from "../../lib/experience/web-vitals";

const CANONICAL_HOSTS = new Set(["askmagicmike.com", "www.askmagicmike.com"]);

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVital: ReportWebVitalsCallback = (metric) => {
  if (typeof window === "undefined" || !CANONICAL_HOSTS.has(window.location.hostname)) return;
  if (navigator.webdriver || isKnownInternalQaSearch(window.location.search)) return;
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
    body: JSON.stringify({
      event_name: "web_vital_observed",
      event_category: "system",
      properties,
    }),
    keepalive: true,
  }).catch(() => undefined);
};

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
