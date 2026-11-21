/** Inline IIFE — keep in a .ts file so eslint does not flag layout script bodies. */
export const VINEXT_STATIC_LOCATION_BOOTSTRAP = `(function(){try{var p=location.pathname;var q=location.search?location.search.slice(1).split("&").filter(Boolean):[];var seg=p.replace(/^\\/+|\\/+$/g,"").split("/").filter(Boolean);var s=Symbol.for("vinext.navigationRuntime");var r=self[s]||(self[s]={bootstrap:{routeManifest:null},functions:{}});r.bootstrap.rsc=r.bootstrap.rsc||{rsc:[]};Object.assign(r.bootstrap.rsc,{params:seg.length?{slug:seg}:{},nav:{pathname:p,searchParams:q}});}catch(e){}})();`;

/** Runs after vinext inline payloads on static HTML shells. */
export const VINEXT_STATIC_LOCATION_BOOTSTRAP_LATE = `(function(){function s(){try{var p=location.pathname;var q=location.search?location.search.slice(1).split("&").filter(Boolean):[];var seg=p.replace(/^\\/+|\\/+$/g,"").split("/").filter(Boolean);var sym=Symbol.for("vinext.navigationRuntime");var rt=self[sym];if(!rt||!rt.bootstrap)return;rt.bootstrap.rsc=rt.bootstrap.rsc||{rsc:[]};Object.assign(rt.bootstrap.rsc,{params:seg.length?{slug:seg}:{},nav:{pathname:p,searchParams:q}});}catch(e){}}s();document.addEventListener("DOMContentLoaded",s);})();`;

/**
 * Back / Forward stay in-page. vinext would fetch an RSC payload for the new URL, which a
 * static host cannot serve, and then reload. This capture listener runs before vinext's,
 * stops it, and re-announces the URL through the patched history so the client router
 * and vinext's hooks re-render. Scroll comes back from the position saved by spaNavigate.
 * The PhonePe bridge (/payment-return) is its own document, so it reloads.
 */
export const SPA_POPSTATE_GUARD = `(function(){try{if(window.__sgPopGuard)return;window.__sgPopGuard=1;var doc=function(p){return p==="/payment-return"||p.indexOf("/payment-return/")===0;};var startDoc=doc(location.pathname);addEventListener("popstate",function(e){if(startDoc||doc(location.pathname)){location.reload();return;}e.stopImmediatePropagation();var st=history.state;try{history.replaceState(st,"",location.href);}catch(_){}var y=st&&typeof st.__sgScroll==="number"?st.__sgScroll:null;if(y!==null){var n=0;var go=function(){scrollTo(0,y);if(Math.abs(scrollY-y)>2&&n++<20)requestAnimationFrame(go);};requestAnimationFrame(go);}},true);}catch(e){}})();`;
