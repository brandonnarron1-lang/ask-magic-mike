(function () {
  "use strict";

  var EXPECTED_GATE = "basic-v1";
  var EXPECTED_CONTAINER = "GTM-KZMCSLTJ";
  var EXPECTED_COOKIE = "vv_cookieconsent_status";
  var EXPLICIT_ALLOW = "allow";
  var GOOGLE_SCRIPT_ID = "amm-google-tag-manager";
  var CONSENT_WATCH_INTERVAL_MS = 1000;

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
  var initialized = false;
  var revoked = false;

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

  function queueGoogleCommand() {
    window.dataLayer.push(arguments);
  }

  function isGoogleCookie(name) {
    return (
      name === "_ga" ||
      name === "_gid" ||
      name === "_gat" ||
      name.indexOf("_ga_") === 0 ||
      name.indexOf("_gat_") === 0 ||
      name.indexOf("_gac_") === 0 ||
      name.indexOf("_gcl_") === 0
    );
  }

  function expireGoogleCookies() {
    var parts = String(document.cookie || "").split(";");
    for (var index = 0; index < parts.length; index += 1) {
      var cookieName = parts[index].split("=", 1)[0].trim();
      if (!cookieName || !isGoogleCookie(cookieName)) {
        continue;
      }
      var expiration =
        encodeURIComponent(cookieName) +
        "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax";
      document.cookie = expiration;
      document.cookie = expiration + "; Domain=.ourtownproperties.com";
    }
  }

  function removeGoogleScript() {
    var existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (!existing) {
      return;
    }
    if (typeof existing.remove === "function") {
      existing.remove();
    } else if (existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  function revokeGoogleConsent() {
    if (!initialized || !loaded) {
      return false;
    }
    queueGoogleCommand("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    expireGoogleCookies();
    removeGoogleScript();
    loaded = false;
    revoked = true;
    return true;
  }

  function loadGoogleTagManager() {
    if (loaded || revoked || !hasExplicitAllow()) {
      return false;
    }

    if (document.getElementById(GOOGLE_SCRIPT_ID)) {
      return false;
    }

    var firstScript = document.getElementsByTagName("script")[0];
    if ((!firstScript || !firstScript.parentNode) && !document.head) {
      return false;
    }

    window.dataLayer = window.dataLayer || [];
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

    initialized = true;
    loaded = true;
    return true;
  }

  function checkConsent() {
    if (hasExplicitAllow()) {
      loadGoogleTagManager();
      return;
    }
    revokeGoogleConsent();
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
  window.setInterval(checkConsent, CONSENT_WATCH_INTERVAL_MS);
})();
