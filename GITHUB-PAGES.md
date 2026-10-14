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
Guest carts are saved in the browser; customer accounts and cross-device cart
sync require the Supabase configuration described below.

# Admin dashboard setup

Product changes, uploaded images, and administrator accounts use Supabase.
Without these settings, the storefront uses the API's sample catalog and the
admin dashboard remains unavailable.

1. For a new Supabase project, run [`supabase/schema.sql`](./supabase/schema.sql)
   in the SQL Editor. It creates the product catalog, administrator-only
   product/image policies, customer-owned row policies, and sample products.
   For an existing store database, run
   [`supabase/customer-accounts.sql`](./supabase/customer-accounts.sql) to add
   customer profiles and carts, allow custom product categories, and apply the
   customer row-level security policies without reseeding the catalog.
   Then run [`supabase/traffic-analytics.sql`](./supabase/traffic-analytics.sql)
   to enable admin traffic reporting and privacy-conscious page-view tracking.
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
   `https://www.babujyenterprise.co.ke/admin` and
   `https://www.babujyenterprise.co.ke/account` as redirect URLs. Enable email
   confirmation and configure
   custom SMTP in **Authentication → SMTP Settings** for reliable password
   reset and account confirmation email delivery to customers/admins.
5. Open `https://www.babujyenterprise.co.ke/admin` and sign in using the
   administrator account. The dashboard supports catalog creation, edits,
   any non-empty product category, price changes, featured status, image
   URLs/uploads, and deletion. The admin dashboard also reports page views,
   browsing sessions, daily traffic, popular pages, and referral sites. Tracking
   stores anonymous session IDs and page/referrer host names only, not personal
   details, IP addresses, or full referrer URLs. Customers can browse and shop
   as guests, set quantities directly in the cart, or create an account at
   `/account` to save profile details and sync their cart between visits/devices.
   It also supports password changes and emailed reset links. Passwords are
   never displayed or sent in email; reset emails contain time-limited links.

# Contact form email delivery

The contact form sends messages directly to `babujy13@gmail.com` through the
Resend API. Configure these private environment variables for the Vercel
server service in **Settings → Environment Variables**, with Production
selected:

- `RESEND_API_KEY`: a private API key created in Resend. Never use a `VITE_`
  prefix or commit this value.
- `RESEND_FROM_EMAIL`: a sender address on a domain verified in Resend, for
  example `Babujy Enterprise <contact@babujyenterprise.co.ke>`. Add the DNS
  records Resend provides for the domain before sending.

Redeploy after adding the variables. The form displays a success confirmation
only after Resend accepts the message, and shows an error if delivery fails.

Checkout currently shows manual M-PESA instructions; it does not create stored
orders, so order-management and revenue reporting are not yet available.
