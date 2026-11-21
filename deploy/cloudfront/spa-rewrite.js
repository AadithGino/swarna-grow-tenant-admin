// CloudFront Function (runtime cloudfront-js-2.0), event type: viewer-request.
// Attach it to the distribution's default behaviour (origin = the S3 bucket).
//
// The portal is a single-page app: every route (/dashboard, /customers/123, /landing ...)
// is drawn by the client router from one HTML shell. S3 has no rewrites, so this
// function maps app routes to that shell while real files (/_next/..., /lp/..., favicon)
// pass through untouched.
//
// Do NOT also add "custom error responses 403/404 -> /index.html": that turns a missing
// JS chunk into HTML and hides real errors. This function is the only rewrite needed.

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Real files have an extension in the last path segment.
  var last = uri.substring(uri.lastIndexOf("/") + 1);
  if (last.indexOf(".") !== -1) return request;

  // Canonical URLs: /dashboard/ -> /dashboard (keeps one history entry per page).
  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") {
    var qs = "";
    var keys = Object.keys(request.querystring);
    if (keys.length) {
      var parts = [];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = request.querystring[k];
        var values = v.multiValue ? v.multiValue : [v];
        for (var j = 0; j < values.length; j++) {
          parts.push(values[j].value === "" ? k : k + "=" + values[j].value);
        }
      }
      qs = "?" + parts.join("&");
    }
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: uri.replace(/\/+$/, "") + qs } },
    };
  }

  // PhonePe return bridge is its own page.
  if (uri === "/payment-return" || uri.indexOf("/payment-return/") === 0) {
    request.uri = "/payment-return/index.html";
    return request;
  }

  request.uri = "/index.html";
  return request;
}
