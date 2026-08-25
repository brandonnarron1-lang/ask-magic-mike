(function () {
  "use strict";

  var EXPECTED_GATE = "basic-v1";
  var EXPECTED_CONTAINER = "GTM-KZMCSLTJ";
  var EXPECTED_COOKIE = "vv_cookieconsent_status";
  var EXPLICIT_ALLOW = "allow";
  var GOOGLE_SCRIPT_ID = "amm-google-tag-manager";
  var POLL_INTERVAL_MS = 250;
  var MAX_POLL_ATTEMPTS = 240;

  var gateScript = document.currentScript;
  if (
    !gateScript ||
    gateScript.getAttribute("data-amm-consent-gate") !== EXPECTED_GATE ||
    gateScript.getAttribute("data-amm-gtm-container") !== EXPECTED_CONTAINER ||
    gateScript.getAttribute("data-amm-consent-cookie") !== EXPECTED_COOKIE
  ) {
    return;
  }

  var loaded = false;
  var pollAttempts = 0;
  var pollTimer = null;

  function readCookie(name) {
    var encodedName = encodeURIComponent(name) + "=";
    var parts = String(document.cookie || "").split(";");

    for (var index = 0; index < parts.length; index += 1) {
      var part = parts[index].trim();
      if (part.indexOf(encodedName) === 0) {
        try {
          return decodeURIComponent(part.slice(encodedName.length));
        } catch (_error) {
          return "";
        }
      }
    }

    return "";
  }

  function hasExplicitAllow() {
    return readCookie(EXPECTED_COOKIE) === EXPLICIT_ALLOW;
  }

  function existingGoogleScriptIsCanonical() {
    var existing = document.getElementById(GOOGLE_SCRIPT_ID);
    return Boolean(
      existing &&
      existing.getAttribute("src") ===
        "https://www.googletagmanager.com/gtm.js?id=" + EXPECTED_CONTAINER,
    );
  }

  function stopPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function loadGoogleTagManager() {
    if (loaded || !hasExplicitAllow()) {
      return false;
    }

    if (document.getElementById(GOOGLE_SCRIPT_ID)) {
      loaded = existingGoogleScriptIsCanonical();
      if (loaded) {
        stopPolling();
      }
      return loaded;
    }

    var firstScript = document.getElementsByTagName("script")[0];
    if ((!firstScript || !firstScript.parentNode) && !document.head) {
      return false;
    }

    window.dataLayer = window.dataLayer || [];
    function queueGoogleCommand() {
      window.dataLayer.push(arguments);
    }

    queueGoogleCommand("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    queueGoogleCommand("set", "ads_data_redaction", true);
    queueGoogleCommand("set", "url_passthrough", false);
    queueGoogleCommand("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    var googleScript = document.createElement("script");
    googleScript.async = true;
    googleScript.id = GOOGLE_SCRIPT_ID;
    googleScript.src =
      "https://www.googletagmanager.com/gtm.js?id=" + EXPECTED_CONTAINER;
    googleScript.referrerPolicy = "strict-origin-when-cross-origin";

    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(googleScript, firstScript);
    } else {
      document.head.appendChild(googleScript);
    }

    loaded = true;
    stopPolling();
    return true;
  }

  function checkConsent() {
    if (loadGoogleTagManager()) {
      return;
    }

    pollAttempts += 1;
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      stopPolling();
    }
  }

  function checkAfterInteraction() {
    window.setTimeout(checkConsent, 0);
    window.setTimeout(checkConsent, 100);
    window.setTimeout(checkConsent, 500);
  }

  document.addEventListener("click", checkAfterInteraction, true);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      checkConsent();
    }
  });
  window.addEventListener("pageshow", checkConsent);

  checkConsent();
  if (!loaded) {
    pollTimer = window.setInterval(checkConsent, POLL_INTERVAL_MS);
  }
})();
