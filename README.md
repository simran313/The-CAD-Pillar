# The-CAD-Pillar

## CAD Quote Calculator with Email OTP Verification

This is the website for The CAD Pillar, featuring an integrated CAD quote calculator with email-based OTP verification.

## Features

- Real-time CAD pricing calculator for jewelry designs
- Email OTP verification via Brevo Transactional Email API
- Secure quote storage in Supabase
- Private image upload to Supabase Storage
- PayPal integration for 50% deposit payment
- **Admin Dashboard** for managing quotes (secured with Netlify Identity)

## Setup Instructions

### Required Environment Variables

Configure the following environment variables in your Netlify deployment:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS (keep secret!)
- `BREVO_API_KEY` - API key from Brevo for sending transactional emails
- `BREVO_SENDER_EMAIL` - Verified sender email address (info@thecadpillar.com)
- `BREVO_SENDER_NAME` - Name to appear in sent emails (e.g., "The CAD Pillar")
- `PAYPAL_BUSINESS_EMAIL` - Your PayPal business email for receiving payments
- `ADMIN_EMAIL_ALLOWLIST` - (Optional) Comma-separated list of admin email addresses. If not set, any authenticated Netlify Identity user can access admin dashboard.

### Supabase Setup

1. **Database Schema**: Run the SQL in `supabase/schema.sql` to create the required tables:
   - `otp_requests` - Stores OTP verification requests
   - `cad_quotes` - Stores customer quotes and pricing

2. **Admin Dashboard Migration**: Run the SQL in `supabase/admin-dashboard-migration.sql` to add admin features:
   - Adds `admin_notes` column to `cad_quotes`
   - Adds `updated_at` column with auto-update trigger
   - Adds indexes for better performance

3. **Storage Bucket**: Create a private storage bucket named `design-images` in your Supabase Storage:
   - Bucket name: `design-images`
   - Access: Private (not public)
   - Functions will use the service role key to upload images

### Brevo Setup

1. Sign up for a Brevo account (formerly Sendinblue)
2. Verify your sender email address (info@thecadpillar.com)
3. Generate an API key from your account settings
4. Add the API key to your Netlify environment variables

### Netlify Identity Setup (for Admin Dashboard)

1. **Enable Netlify Identity**:
   - Go to your Netlify site dashboard
   - Navigate to Site Settings > Identity
   - Click "Enable Identity"

2. **Configure Registration**:
   - Set Registration to "Invite only" (recommended for admin access)
   - Under "External providers", you can optionally enable Google, GitHub, etc.

3. **Invite Admin Users**:
   - Go to Identity tab in your Netlify dashboard
   - Click "Invite users"
   - Enter the email addresses of admin users
   - They will receive an invitation email to set up their account

4. **Configure Admin Email Allowlist** (Optional but recommended):
   - Add `ADMIN_EMAIL_ALLOWLIST` environment variable to your Netlify site
   - Set value to comma-separated list of admin emails (e.g., `admin@example.com,manager@example.com`)
   - Only these email addresses will be able to access admin functions
   - If not set, any authenticated Netlify Identity user can access the admin dashboard

## How It Works

### Public Quote Flow

1. **Quote Configuration**: User selects design options (type, stones, metal, etc.)
2. **Customer Details**: User enters their contact information and uploads a reference image
3. **OTP Verification**: System sends a 6-digit OTP to the user's email via Brevo
4. **Quote Submission**: After OTP verification, the quote is calculated server-side and saved to Supabase
5. **Payment**: User can proceed to pay a 50% deposit via PayPal

### Admin Dashboard

1. **Access**: Navigate to `/admin/` on your site
2. **Login**: Sign in using Netlify Identity
3. **View Quotes**: See a paginated list of all submitted quotes
4. **Filter**: Filter quotes by status (pending, paid, completed, cancelled)
5. **View Details**: Click "View Details" to see full quote information
6. **Update Status**: Change quote status and add admin notes
7. **View Images**: Generate and view signed URLs for customer reference images

## Security Features

- OTP is hashed using SHA256 before storage
- OTP expires after 10 minutes
- Maximum 5 verification attempts per OTP
- Row Level Security (RLS) enabled on all tables
- Functions use service role key (never exposed to client)
- Images stored in private Supabase Storage bucket
- **Admin Dashboard Security**:
  - Protected by Netlify Identity authentication
  - JWT token validation on all admin API endpoints
  - Optional email allowlist for restricting admin access
  - Signed URLs for private image access (expires in 1 hour)

## Development

This is a single-page application built with:
- Vanilla JavaScript
- Tailwind CSS
- Netlify Functions (serverless)
- Supabase (database and storage)
- Brevo API (email delivery)

## License

© 2024 The CAD Pillar. All rights reserved.
