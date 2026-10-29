(function () {
  var existing = window.AskMagicMikeWidget;
  if (existing && existing.__loaded) return;

  var currentScript = document.currentScript;
  var pageParams = new URLSearchParams(window.location.search);
  var defaultConfig = {
    source: currentScript && currentScript.dataset.source || "external",
    medium: currentScript && currentScript.dataset.medium || "website",
    campaign: currentScript && currentScript.dataset.campaign || "sitewide-widget",
    placement: currentScript && currentScript.dataset.placement || "sitewide-floating",
    placement_id: currentScript && currentScript.dataset.placementId || currentScript && currentScript.dataset.placement || "sitewide-floating",
    listing_id: currentScript && currentScript.dataset.listingId || pageParams.get("listing_id") || "",
    property_id: currentScript && currentScript.dataset.propertyId || pageParams.get("property_id") || "",
    agent_id: currentScript && currentScript.dataset.agentId || pageParams.get("agent_id") || "",
    theme: currentScript && currentScript.dataset.theme || "black-diamond"
  };

  function originFromScript() {
    try {
      return new URL((currentScript && currentScript.src) || window.location.href).origin;
    } catch {
      return "";
    }
  }

  function buildWidgetUrl(config) {
    // This standalone loader cannot trust the host page's URL, title, query or
    // config. Its small public projection is exercised against the server
    // boundary in attribution-minimization.test.ts. No property/person IDs.
    var allowed = {
      source: ["ourtownproperties", "widget", "external", "facebook", "instagram", "google", "qr", "email"],
      medium: ["owned_media", "embed", "website", "referral", "organic_social", "social_organic", "print"],
      campaign: ["amm_owned_demand_2026", "amm_seller_buyer_launch_2026", "website_widget", "sitewide-widget", "full_form_fallback"],
      placement: ["sitewide-floating", "homepage", "homepage-hero", "home-value-page", "buyer-page", "seller-page", "ask-page", "widget", "wordpress_home_value_page", "wordpress_listing_buyer", "wordpress_rental_to_homeownership"]
    };
    function code(key, value) {
      if (typeof value !== "string" || value.length > 120) return "";
      var normalized = value.trim().toLowerCase();
      return allowed[key].indexOf(normalized) !== -1 ? normalized : "";
    }
    function publicPage(value) {
      if (typeof value !== "string" || value.length > 4096 || value.indexOf("\\") !== -1 || Array.from(value).some(function (c) { return c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127; })) return "";
      try {
        var url = new URL(value);
        if (["https://www.ourtownproperties.com", "https://ourtownproperties.com"].indexOf(url.origin) === -1) return "";
        var paths = ["/", "/home-value/", "/how-much-is-your-home-worth/", "/ask-mike/", "/ask-magic-mike/", "/property-search/", "/we-buy-homes/", "/we-buy-houses/", "/rentals/"];
        var path = paths.find(function (p) { return p.replace(/\/$/, "") === url.pathname.replace(/\/$/, ""); });
        return path ? url.origin + path : "";
      } catch { return ""; }
    }
    var base = originFromScript();
    // Never send parent context to an arbitrary baseUrl supplied by the page.
    try {
      var destination = new URL(base);
      if (destination.protocol !== "https:" && !(destination.protocol === "http:" && ["localhost", "127.0.0.1"].indexOf(destination.hostname) !== -1)) return "";
    } catch { return ""; }
    var params = new URLSearchParams();
    ["source", "medium", "campaign", "placement"].forEach(function (key) {
      var value = code(key, config[key] || defaultConfig[key]);
      if (value) params.set(key, value);
    });
    var placement = code("placement", config.placement_id || config.placement || defaultConfig.placement_id);
    if (placement) params.set("placement_id", placement);
    var parent = publicPage(window.location.href);
    var referrer = publicPage(document.referrer);
    if (parent) { params.set("parent_url", parent); params.set("embed_host", new URL(parent).hostname); }
    if (referrer) params.set("referrer", referrer);
    return base + "/widget/v1?" + params.toString();
  }

  function init(options) {
    var config = Object.assign({}, defaultConfig, options || {});
    if (document.getElementById("askmagicmike-widget-root")) return;

    var root = document.createElement("div");
    root.id = "askmagicmike-widget-root";
    root.style.position = "fixed";
    root.style.zIndex = "2147483000";
    root.style.right = "18px";
    root.style.bottom = "18px";
    root.style.fontFamily = "Arial, Helvetica, sans-serif";

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Ask Magic Mike");
    launcher.setAttribute("aria-expanded", "false");
    launcher.textContent = "Ask Magic Mike";
    launcher.style.border = "1px solid rgba(205,162,74,.68)";
    launcher.style.background = "#050505";
    launcher.style.color = "#f4ead4";
    launcher.style.borderRadius = "999px";
    launcher.style.padding = "14px 18px";
    launcher.style.boxShadow = "0 22px 70px rgba(0,0,0,.45)";
    launcher.style.fontSize = "12px";
    launcher.style.fontWeight = "800";
    launcher.style.letterSpacing = ".14em";
    launcher.style.textTransform = "uppercase";
    launcher.style.cursor = "pointer";
    launcher.style.minHeight = "48px";
    launcher.style.backdropFilter = "blur(14px)";

    var panel = document.createElement("div");
    panel.hidden = true;
    panel.style.width = "390px";
    panel.style.height = "680px";
    panel.style.maxWidth = "calc(100vw - 24px)";
    panel.style.maxHeight = "calc(100vh - 24px)";
    panel.style.border = "1px solid rgba(205,162,74,.46)";
    panel.style.borderRadius = "12px";
    panel.style.overflow = "hidden";
    panel.style.background = "#050505";
    panel.style.boxShadow = "0 28px 100px rgba(0,0,0,.58)";

    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close Ask Magic Mike");
    close.textContent = "Close";
    close.style.position = "absolute";
    close.style.right = "14px";
    close.style.top = "14px";
    close.style.zIndex = "2";
    close.style.border = "1px solid rgba(205,162,74,.5)";
    close.style.background = "rgba(5,5,5,.82)";
    close.style.color = "#f4ead4";
    close.style.borderRadius = "999px";
    close.style.padding = "8px 10px";
    close.style.fontSize = "10px";
    close.style.fontWeight = "800";
    close.style.letterSpacing = ".12em";
    close.style.textTransform = "uppercase";
    close.style.cursor = "pointer";
    close.style.minHeight = "44px";

    var frame = document.createElement("iframe");
    frame.title = "Ask Magic Mike widget";
    frame.referrerPolicy = "no-referrer";
    frame.src = buildWidgetUrl(config);
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "0";
    frame.setAttribute("allow", "clipboard-write");

    function openWidget() {
      panel.hidden = false;
      launcher.hidden = true;
      launcher.setAttribute("aria-expanded", "true");
      close.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent("askmagicmike:opened"));
    }

    function closeWidget() {
      panel.hidden = true;
      launcher.hidden = false;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent("askmagicmike:closed"));
    }

    launcher.addEventListener("click", openWidget);
    close.addEventListener("click", closeWidget);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) closeWidget();
    });
    window.addEventListener("message", function (event) {
      // Only our exact mounted frame may request closure. No wildcard origin,
      // resizing, form mutation or contact action is accepted here.
      if (event.source !== frame.contentWindow || event.origin !== originFromScript()) return;
      if (event.data && event.data.type === "askmagicmike:close" && !panel.hidden) closeWidget();
    });

    panel.appendChild(close);
    panel.appendChild(frame);
    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);

    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
      root.style.left = "10px";
      root.style.right = "10px";
      root.style.bottom = "10px";
      panel.style.width = "100%";
      panel.style.height = "calc(100vh - 20px)";
      if (window.CSS && window.CSS.supports("height", "100dvh")) panel.style.height = "calc(100dvh - 20px)";
      panel.style.borderRadius = "12px";
      launcher.style.width = "100%";
    }

    return { open: openWidget, close: closeWidget };
  }

  window.AskMagicMikeWidget = {
    __loaded: true,
    init: init
  };

  if (!currentScript || currentScript.dataset.autoInit !== "false") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { init(defaultConfig); });
    } else {
      init(defaultConfig);
    }
  }
})();
