/**
 * Cloudflare Worker script for ZzCFIzZ Poetry Blog (GitHub Pages Origin)
 * 
 * Features:
 * 1. Global Edge Caching for Static Assets (Images, WebP, Fonts, CSS, JS)
 * 2. Automatic Security Headers (NoSniff, Frame-Options, Referrer-Policy)
 * 3. Smart Cache-Control headers tailored for GitHub Pages
 * 4. Zero-latency Global Edge delivery across 300+ Edge locations
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle GET and HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    // Try Cloudflare Edge Cache first
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      // Fetch from GitHub Pages origin
      response = await fetch(request);

      // Clone response to modify headers
      response = new Response(response.body, response);

      // Add Security Headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      const path = url.pathname.toLowerCase();

      // Asset specific Caching Policies
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
