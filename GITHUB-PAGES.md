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

# Admin dashboard setup

Product changes, uploaded images, and administrator accounts use Supabase.
Without these settings, the storefront uses the API's sample catalog and the
admin dashboard remains unavailable.

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql)
   in its SQL Editor. This creates the public product catalog and the
   administrator-only product and image policies, and seeds the current sample
   catalog.
2. In Supabase **Authentication → Users**, create the first administrator with
   the intended email address. In the SQL Editor, grant that user admin access:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = lower('ADMIN_EMAIL_HERE')
   on conflict (user_id) do nothing;
   ```

3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase
   project API settings to the Vercel project as environment variables, then
   redeploy. The anon/publishable key is intended for browser use; never expose
   the Supabase service-role key in Vite variables or frontend code.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to
   `https://www.babujyenterprise.co.ke` and allow
   `https://www.babujyenterprise.co.ke/admin` as a redirect URL. Configure
   custom SMTP in **Authentication → SMTP Settings** for reliable password
   reset email delivery to customers/admins.
5. Open `https://www.babujyenterprise.co.ke/admin` and sign in using the
   administrator account. The dashboard supports catalog creation, edits,
   price changes, featured status, image URLs/uploads, and deletion. It also
   supports password changes and emailed reset links. Passwords are never
   displayed or sent in email; reset emails contain time-limited links.

Checkout currently shows manual M-PESA instructions; it does not create stored
orders, so order-management and revenue reporting are not yet available.
