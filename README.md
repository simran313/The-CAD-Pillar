# The-CAD-Pillar

## CAD Quote Calculator with Email OTP Verification

This is the website for The CAD Pillar, featuring an integrated CAD quote calculator with email-based OTP verification.

## Features

- Real-time CAD pricing calculator for jewelry designs
- Email OTP verification via Brevo Transactional Email API
- Secure quote storage in Supabase
- Private image upload to Supabase Storage
- PayPal integration for 50% deposit payment

## Setup Instructions

### Required Environment Variables

Configure the following environment variables in your Netlify deployment:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS (keep secret!)
- `BREVO_API_KEY` - API key from Brevo for sending transactional emails
- `BREVO_SENDER_EMAIL` - Verified sender email address (info@thecadpillar.com)
- `BREVO_SENDER_NAME` - Name to appear in sent emails (e.g., "The CAD Pillar")
- `PAYPAL_BUSINESS_EMAIL` - Your PayPal business email for receiving payments

### Supabase Setup

1. **Database Schema**: Run the SQL in `supabase/schema.sql` to create the required tables:
   - `otp_requests` - Stores OTP verification requests
   - `cad_quotes` - Stores customer quotes and pricing

2. **Storage Bucket**: Create a private storage bucket named `design-images` in your Supabase Storage:
   - Bucket name: `design-images`
   - Access: Private (not public)
   - Functions will use the service role key to upload images

### Brevo Setup

1. Sign up for a Brevo account (formerly Sendinblue)
2. Verify your sender email address (info@thecadpillar.com)
3. Generate an API key from your account settings
4. Add the API key to your Netlify environment variables

## How It Works

1. **Quote Configuration**: User selects design options (type, stones, metal, etc.)
2. **Customer Details**: User enters their contact information and uploads a reference image
3. **OTP Verification**: System sends a 6-digit OTP to the user's email via Brevo
4. **Quote Submission**: After OTP verification, the quote is calculated server-side and saved to Supabase
5. **Payment**: User can proceed to pay a 50% deposit via PayPal

## Security Features

- OTP is hashed using SHA256 before storage
- OTP expires after 10 minutes
- Maximum 5 verification attempts per OTP
- Row Level Security (RLS) enabled on all tables
- Functions use service role key (never exposed to client)
- Images stored in private Supabase Storage bucket

## Development

This is a single-page application built with:
- Vanilla JavaScript
- Tailwind CSS
- Netlify Functions (serverless)
- Supabase (database and storage)
- Brevo API (email delivery)

## License

© 2024 The CAD Pillar. All rights reserved.
