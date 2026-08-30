import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const WORDPRESS_HOMEPAGE_URL = "https://www.ourtownproperties.com/";
export const WORDPRESS_HOMEPAGE_CTA_HIDE_RULE =
  ".amm-cta,.amm-cta--dark{display:none !important;}";

const LOCAL_PREVIEW_CSP = [
  "default-src 'none'",
  "base-uri https://www.ourtownproperties.com",
  "connect-src 'none'",
  "script-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "img-src data: https://ourtownproperties.com https://www.ourtownproperties.com",
  "media-src https://ourtownproperties.com https://www.ourtownproperties.com",
  "style-src 'unsafe-inline' https:",
  "font-src data: https:",
].join("; ");

function countExact(source, needle) {
  return source.split(needle).length - 1;
}

export function transformHomepageForCtaPreview(html) {
  const source = String(html ?? "");
  const hideRuleOccurrences = countExact(
    source,
    WORDPRESS_HOMEPAGE_CTA_HIDE_RULE,
  );
  if (hideRuleOccurrences !== 1) {
    throw new Error("wordpress_homepage_preview_hide_rule_precondition_failed");
  }
  if (!/<head\b[^>]*>/i.test(source) || !/<\/head>/i.test(source)) {
    throw new Error("wordpress_homepage_preview_head_precondition_failed");
  }

  const scriptOccurrences = (source.match(/<script\b/gi) ?? []).length;
  const iframeOccurrences = (source.match(/<iframe\b/gi) ?? []).length;
  let transformed = source.replace(
    WORDPRESS_HOMEPAGE_CTA_HIDE_RULE,
    "/* Local QA only: reviewed homepage CTA suppression removed. */",
  );
  transformed = transformed
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "<!-- local preview: script disabled -->")
    .replace(/<script\b[^>]*\/\s*>/gi, "<!-- local preview: script disabled -->")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, "<!-- local preview: noscript disabled -->")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "<!-- local preview: frame disabled -->")
    .replace(/<iframe\b[^>]*\/\s*>/gi, "<!-- local preview: frame disabled -->");
  transformed = transformed.replace(
    /<head\b[^>]*>/i,
    (head) => `${head}\n<base href="${WORDPRESS_HOMEPAGE_URL}">\n<meta http-equiv="Content-Security-Policy" content="${LOCAL_PREVIEW_CSP}">`,
  );

  if (
    transformed.includes(WORDPRESS_HOMEPAGE_CTA_HIDE_RULE) ||
    /<script\b/i.test(transformed) ||
    /<iframe\b/i.test(transformed)
  ) {
    throw new Error("wordpress_homepage_preview_postcondition_failed");
  }

  return {
    html: transformed,
    facts: {
      sourceUrl: WORDPRESS_HOMEPAGE_URL,
      hideRuleOccurrences,
      remainingHideRuleOccurrences: 0,
      scriptOccurrences,
      remainingScriptOccurrences: 0,
      iframeOccurrences,
      remainingIframeOccurrences: 0,
      formActionsBlockedByCsp: true,
      networkConnectionsBlockedByCsp: true,
      externalScriptsBlockedByCsp: true,
    },
  };
}

export async function loadWordPressHomepagePreview() {
  const response = await fetch(WORDPRESS_HOMEPAGE_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "AskMagicMike-Local-Visual-QA/1.0",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  if (
    response.status !== 200 ||
    !/^text\/html(?:;|$)/i.test(response.headers.get("content-type") ?? "")
  ) {
    throw new Error(`wordpress_homepage_preview_fetch_failed_${response.status}`);
  }
  return transformHomepageForCtaPreview(await response.text());
}

function requestedPort() {
  const portIndex = process.argv.indexOf("--port");
  const raw = portIndex >= 0 ? process.argv[portIndex + 1] : "4177";
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error("wordpress_homepage_preview_invalid_port");
  }
  return port;
}

async function main() {
  const preview = await loadWordPressHomepagePreview();
  const port = requestedPort();
  const server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    if (request.url === "/__health") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ ok: true, facts: preview.facts }));
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": LOCAL_PREVIEW_CSP,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(preview.html);
  });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(
      `${JSON.stringify({ url: `http://127.0.0.1:${port}/`, facts: preview.facts })}\n`,
    );
  });
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
