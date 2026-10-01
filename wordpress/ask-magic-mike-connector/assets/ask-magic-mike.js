(function(){
  function trackClick(event){
    var link = event.currentTarget;
    var wrapper = link.closest('[data-amm-source]');
    var source = wrapper ? wrapper.getAttribute('data-amm-source') : 'unknown';
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: 'ask_magic_mike_click', amm_source: source, amm_href: link.href });
    }
    if (window.gtag) {
      window.gtag('event', 'ask_magic_mike_click', { source: source, link_url: link.href });
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    var links = document.querySelectorAll('[data-amm-link="1"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', trackClick);
    }
  });
})();
