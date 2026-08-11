/**
 * Pure Cloudflare Worker deployment script for ZzCFIzZ Poetry Blog
 * Serves static assets directly via env.ASSETS binding + Cloudflare Edge Caching
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle GET and HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Try Cloudflare Edge Cache first for maximum performance
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      // Serve static asset directly from Worker ASSETS binding or origin
      if (env && env.ASSETS) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = await fetch(request);
      }

      // Clone response to attach security & caching headers
      response = new Response(response.body, response);

      // Security Headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      const path = url.pathname.toLowerCase();

      // Cache Control Policies
      if (path.endsWith('.webp') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.svg') || path.endsWith('.woff2')) {
        // Immutable Images & Fonts: 1 Year Cache at Edge and Browser
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        ctx.waitUntil(cache.put(request, response.clone()));
      } else if (path.endsWith('.css') || path.endsWith('.js')) {
        // CSS & JS: 1 Day Cache at Edge with Stale-While-Revalidate
        response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        ctx.waitUntil(cache.put(request, response.clone()));
      } else if (path.endsWith('.html') || path === '/' || path === '') {
        // HTML: Always revalidate to show new poem updates instantly
        response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }

    return response;
  }
};
