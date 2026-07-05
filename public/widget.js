(function () {
  var existing = window.AskMagicMikeWidget;
  if (existing && existing.__loaded) return;

  var currentScript = document.currentScript;
  var defaultConfig = {
    source: currentScript && currentScript.dataset.source || "external",
    medium: currentScript && currentScript.dataset.medium || "website",
    campaign: currentScript && currentScript.dataset.campaign || "sitewide-widget",
    placement: currentScript && currentScript.dataset.placement || "sitewide-floating",
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
    var base = (config.baseUrl || originFromScript() || "").replace(/\/$/, "");
    var params = new URLSearchParams({
      source: config.source || defaultConfig.source,
      medium: config.medium || defaultConfig.medium,
      campaign: config.campaign || defaultConfig.campaign,
      placement: config.placement || defaultConfig.placement,
      parent_url: window.location.href,
      embed_host: window.location.hostname,
      referrer: document.referrer || ""
    });
    return base + "/widget?" + params.toString();
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

    var frame = document.createElement("iframe");
    frame.title = "Ask Magic Mike widget";
    frame.src = buildWidgetUrl(config);
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "0";
    frame.setAttribute("allow", "clipboard-write");

    function openWidget() {
      panel.hidden = false;
      launcher.hidden = true;
      launcher.setAttribute("aria-expanded", "true");
      window.dispatchEvent(new CustomEvent("askmagicmike:opened"));
    }

    function closeWidget() {
      panel.hidden = true;
      launcher.hidden = false;
      launcher.setAttribute("aria-expanded", "false");
      window.dispatchEvent(new CustomEvent("askmagicmike:closed"));
    }

    launcher.addEventListener("click", openWidget);
    close.addEventListener("click", closeWidget);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) closeWidget();
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
