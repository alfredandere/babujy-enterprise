# Vercel production deployment

The storefront and Express API deploy together as Vercel services from the
repository root. The `vercel.json` configuration sends `/api/*` requests to the
API, static assets to the React service, and application routes to its
`index.html` for client-side routing.

The `babujy-enterprise` Vercel project uses the repository root as its root
directory and the Services framework preset. The custom domain
`www.babujyenterprise.co.ke` is attached to the production deployment;
`babujyenterprise.co.ke` redirects to `www`.

The storefront uses the same-origin `/api` path on Vercel. Do not set
`VITE_API_BASE_URL` in the Vercel project. GitHub Pages builds can continue to
use the repository Actions variable `VITE_API_BASE_URL` to reach the API.

# GitHub Pages deployment

GitHub Pages can still host a static mirror of the React storefront. The
Express API must be deployed separately for that mirror.

1. In GitHub, open **Settings → Pages** and set the build and deployment source
   to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, set
   `VITE_API_BASE_URL` to the Vercel deployment origin, without `/api`.
3. Push to `main` or run the **Deploy storefront to GitHub Pages** workflow.

The workflow builds with the repository URL prefix and publishes `client/dist`.
The cart is browser-local and product data is served by the API.
