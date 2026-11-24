/* Zev DOD site script: optional analytics + conversion tracking.
   Paste your IDs below. Leave blank to load nothing (no cookies, no requests). */
(function () {
  var CONFIG = {
    GA4_ID: "",            // Google Analytics 4 Measurement ID, e.g. "G-ABC123XYZ"
    CF_BEACON_TOKEN: ""    // Cloudflare Web Analytics token (cookie-free), e.g. "0123abcd..."
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function load(src, attrs) {
    var s = document.createElement("script");
    s.src = src; s.async = true; s.defer = true;
    if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
    document.head.appendChild(s);
  }

  if (CONFIG.GA4_ID) {
    load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA4_ID));
    gtag("js", new Date());
    gtag("config", CONFIG.GA4_ID, { anonymize_ip: true });
  }
  if (CONFIG.CF_BEACON_TOKEN) {
    load("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: CONFIG.CF_BEACON_TOKEN }) });
  }

  /* zevTrack(name, params): records a conversion or interaction event.
     Key events to mark as conversions in GA4: generate_lead, design_order, onboarding_submit. */
  window.zevTrack = function (name, params) {
    params = params || {};
    params.page_path = location.pathname + location.hash;
    try { gtag("event", name, params); } catch (e) {}
  };

  /* Automatic click tracking for outbound actions */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    var map = [
      [/dropbox\.com\/request/, "upload_click"],
      [/paypal\.com/, "paypal_click"],
      [/ig\.me|instagram\.com/, "instagram_click"],
      [/^mailto:/, "email_click"],
      [/youtube\.com/, "youtube_click"],
      [/tiktok\.com/, "tiktok_click"]
    ];
    for (var i = 0; i < map.length; i++) {
      if (map[i][0].test(h)) { window.zevTrack(map[i][1], { link_url: h.split("?")[0] }); return; }
    }
    if (a.dataset.cta) window.zevTrack("cta_click", { cta: a.dataset.cta });
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    var y = document.querySelectorAll("[data-year]");
    for (var i = 0; i < y.length; i++) y[i].textContent = new Date().getFullYear();
  });
})();
