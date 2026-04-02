globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderers } from './chunks/_@astro-renderers_C0jZesLU.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_B7QQQQ1Z.mjs';
import { manifest } from './manifest_DZLB6_YG.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/.well-known/atproto-did.astro.mjs');
const _page2 = () => import('./pages/.well-known/webfinger.astro.mjs');
const _page3 = () => import('./pages/api/car-records.astro.mjs');
const _page4 = () => import('./pages/api/letterboxd-rss.astro.mjs');
const _page5 = () => import('./pages/api/purge.astro.mjs');
const _page6 = () => import('./pages/car.astro.mjs');
const _page7 = () => import('./pages/dare.astro.mjs');
const _page8 = () => import('./pages/deerdirectprivacypolicy.astro.mjs');
const _page9 = () => import('./pages/gglb.astro.mjs');
const _page10 = () => import('./pages/opengraph-image.astro.mjs');
const _page11 = () => import('./pages/post/_rkey_/opengraph-image.astro.mjs');
const _page12 = () => import('./pages/post/_rkey_/purge.astro.mjs');
const _page13 = () => import('./pages/post/_rkey_.astro.mjs');
const _page14 = () => import('./pages/purge.astro.mjs');
const _page15 = () => import('./pages/right/now.astro.mjs');
const _page16 = () => import('./pages/rss.astro.mjs');
const _page17 = () => import('./pages/twoobprivacypolicy.astro.mjs');
const _page18 = () => import('./pages/uses.astro.mjs');
const _page19 = () => import('./pages/writing.astro.mjs');
const _page20 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js", _page0],
    ["src/pages/.well-known/atproto-did.ts", _page1],
    ["src/pages/.well-known/webfinger.ts", _page2],
    ["src/pages/api/car-records.ts", _page3],
    ["src/pages/api/letterboxd-rss.ts", _page4],
    ["src/pages/api/purge.ts", _page5],
    ["src/pages/car.astro", _page6],
    ["src/pages/dare.astro", _page7],
    ["src/pages/deerdirectprivacypolicy.astro", _page8],
    ["src/pages/gglb.astro", _page9],
    ["src/pages/opengraph-image.ts", _page10],
    ["src/pages/post/[rkey]/opengraph-image.ts", _page11],
    ["src/pages/post/[rkey]/purge.astro", _page12],
    ["src/pages/post/[rkey].astro", _page13],
    ["src/pages/purge.astro", _page14],
    ["src/pages/right/now.astro", _page15],
    ["src/pages/rss.ts", _page16],
    ["src/pages/twoobprivacypolicy.astro", _page17],
    ["src/pages/uses.astro", _page18],
    ["src/pages/writing.astro", _page19],
    ["src/pages/index.astro", _page20]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = undefined;
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
