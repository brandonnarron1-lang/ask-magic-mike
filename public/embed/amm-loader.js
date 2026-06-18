/**
 * Ask Magic Mike — WordPress Embed Loader
 * https://www.askmagicmike.com
 *
 * Drop this script on any WordPress page or theme:
 *   <script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
 *
 * Then place one or more embed targets anywhere in your HTML:
 *   <div class="amm-embed"
 *        data-utm-source="ourtownproperties"
 *        data-utm-medium="referral"
 *        data-utm-campaign="website_widget">
 *   </div>
 *
 * Attributes (all optional — safe defaults are applied):
 *   data-utm-source     Default: "ourtownproperties"
 *   data-utm-medium     Default: "referral"
 *   data-utm-campaign   Default: "website_widget"
 *   data-height         iframe height in px. Default: 580
 *   data-q              Pre-fill the question field. Default: ""
 *
 * Attribution:
 *   - The referrer URL is captured automatically from window.location.href
 *   - UTM params are forwarded to the intake form and recorded on every lead
 *   - Do NOT use utm_medium=paid or cpc unless the placement is a paid ad
 *
 * Safe use only:
 *   - Not for MLS/IDX listing data
 *   - Not for sending outbound SMS/email/calls
 *   - Do not commit credentials or API keys alongside this file
 *
 * Support: brandonnarron1@gmail.com / Our Town Properties
 */
(function () {
  "use strict";

  var AMM_BASE = "https://www.askmagicmike.com";
  var EMBED_PATH = "/embed/ask";
  var DEFAULT_HEIGHT = 580;
  var IFRAME_TITLE = "Ask Magic Mike — Our Town Properties real estate guidance";

  function buildEmbedUrl(el) {
    var params = {
      utm_source:   el.getAttribute("data-utm-source")   || "ourtownproperties",
      utm_medium:   el.getAttribute("data-utm-medium")   || "referral",
      utm_campaign: el.getAttribute("data-utm-campaign") || "website_widget",
    };

    var q = el.getAttribute("data-q") || "";
    if (q) params.q = q;

    // Capture parent-page referrer for attribution tracing
    if (window.location && window.location.href) {
      params.referrer = window.location.href;
    }

    var qs = Object.keys(params)
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");

    return AMM_BASE + EMBED_PATH + "?" + qs;
  }

  function buildIframe(el) {
    var height = parseInt(el.getAttribute("data-height") || "", 10) || DEFAULT_HEIGHT;
    var iframe = document.createElement("iframe");
    iframe.src = buildEmbedUrl(el);
    iframe.title = IFRAME_TITLE;
    iframe.width = "100%";
    iframe.height = String(height);
    iframe.frameBorder = "0";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allowfullscreen", "false");
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.style.display = "block";
    iframe.style.maxWidth = "600px";
    iframe.style.margin = "0 auto";
    return iframe;
  }

  function mount() {
    var containers = document.querySelectorAll("[data-amm-embed], .amm-embed");
    for (var i = 0; i < containers.length; i++) {
      var el = containers[i];
      if (el.getAttribute("data-amm-mounted") === "1") continue;
      el.setAttribute("data-amm-mounted", "1");
      el.innerHTML = "";
      el.appendChild(buildIframe(el));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
