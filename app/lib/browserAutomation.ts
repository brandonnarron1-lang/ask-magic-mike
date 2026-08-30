const AUTOMATION_USER_AGENT_PATTERN = /\b(?:HeadlessChrome|Playwright|Puppeteer)\b/i;

export function isBrowserAutomation() {
  try {
    return typeof navigator !== "undefined" && (
      navigator.webdriver === true ||
      isAutomatedBrowserUserAgent(navigator.userAgent)
    );
  } catch {
    return false;
  }
}

export function isAutomatedBrowserUserAgent(value: string | null) {
  return typeof value === "string" && AUTOMATION_USER_AGENT_PATTERN.test(value);
}
