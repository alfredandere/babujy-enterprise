# GitHub Pages deployment

GitHub Pages hosts the React storefront as a static site. The Express API must
remain deployed separately (for example, on Vercel).

1. Push this project to a GitHub repository on the `main` branch.
2. Deploy this repository to Vercel as a separate project with the root
   directory set to `server`. Vercel detects the Express API from
   `server/package.json` and `server/index.js`. Set `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` in the Vercel project environment variables if the admin
   login is needed.
3. In GitHub, open the repository's **Settings → Secrets and variables →
   Actions → Variables** and add `VITE_API_BASE_URL` with the Vercel deployment
   origin (for example, `https://your-project.vercel.app`, without `/api`).
4. In **Settings → Pages**, set the build and deployment source to **GitHub
   Actions**.
5. Push to `main` or run the **Deploy storefront to GitHub Pages** workflow.

The workflow builds the storefront with the correct repository URL prefix and
deploys it. The cart is browser-local; product data and admin API calls require
the configured API URL.
