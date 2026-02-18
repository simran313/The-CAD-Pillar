# Admin Dashboard Setup Guide

This guide walks you through setting up the Admin Dashboard for managing CAD quote leads.

## Prerequisites

Before starting, ensure you have:
- A deployed Netlify site for The CAD Pillar
- Supabase project with the base schema already set up
- Admin access to your Netlify site settings

## Step 1: Database Migration

Run the admin dashboard migration in your Supabase SQL Editor:

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Open and run `supabase/admin-dashboard-migration.sql`

This will:
- Add `admin_notes` column to `cad_quotes` table
- Add `updated_at` column with auto-update trigger
- Create necessary indexes

**Verification**: Check that the `cad_quotes` table now has these new columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cad_quotes';
```

## Step 2: Enable Netlify Identity

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings > Identity**
3. Click **Enable Identity**

### Configure Identity Settings

1. **Registration Preferences**:
   - Set to **Invite only** (recommended for admin access)
   - This prevents unauthorized users from signing up

2. **External Providers** (Optional):
   - Enable Google, GitHub, or other providers if desired
   - Admins can use these to log in instead of email/password

3. **Email Templates** (Optional):
   - Customize the invitation and confirmation emails
   - Update branding to match The CAD Pillar

## Step 3: Configure Environment Variables

Add the following environment variable to your Netlify site:

1. Go to **Site Settings > Environment Variables**
2. Add new variable:
   - **Key**: `ADMIN_EMAIL_ALLOWLIST`
   - **Value**: Comma-separated list of admin email addresses
   - **Example**: `admin@thecadpillar.com,manager@example.com`

**Important Notes**:
- If `ADMIN_EMAIL_ALLOWLIST` is not set, ANY authenticated Netlify Identity user can access the admin dashboard
- For security, always set this variable in production
- Use lowercase emails in the allowlist

## Step 4: Invite Admin Users

1. Go to the **Identity** tab in your Netlify dashboard
2. Click **Invite users**
3. Enter the email addresses of admin users (must match `ADMIN_EMAIL_ALLOWLIST`)
4. Click **Send**

The invited users will receive an email with a link to set up their account.

## Step 5: Verify Deployment

After deploying your changes:

1. Navigate to `https://your-site.netlify.app/admin/`
2. You should see the admin login page
3. Click "Sign In with Netlify Identity"
4. The Netlify Identity modal should appear

## Step 6: Test Admin Access

### Test 1: Unauthenticated Access
1. Open your browser's developer console
2. Try accessing the admin API directly:
   ```javascript
   fetch('/.netlify/functions/admin-list-quotes')
     .then(r => r.json())
     .then(console.log);
   ```
3. **Expected**: 401 Unauthorized error

### Test 2: Authenticated Access
1. Log in to the admin dashboard with an invited user
2. You should see the quotes list (may be empty if no quotes yet)
3. Try filtering by status
4. Try viewing pagination controls

### Test 3: Quote Management
If you have existing quotes:
1. Click "View Details" on a quote
2. Try updating the status
3. Add some admin notes
4. Click "Update Quote"
5. **Expected**: Success message and updated values

### Test 4: Image Access
If a quote has an uploaded image:
1. Open the quote details
2. Click "View / Download Image"
3. **Expected**: Image opens in new tab with a signed URL

### Test 5: Unauthorized Email
1. Invite a user whose email is NOT in `ADMIN_EMAIL_ALLOWLIST`
2. Have them log in to the admin dashboard
3. **Expected**: 403 Forbidden error when trying to access admin functions

## Troubleshooting

### Issue: Cannot access admin dashboard after login
**Solution**: 
- Check browser console for errors
- Verify `ADMIN_EMAIL_ALLOWLIST` includes your email
- Try logging out and back in
- Check that environment variables are set correctly

### Issue: "Token has expired" error
**Solution**: 
- Log out and log back in
- Netlify Identity tokens expire after a certain time
- The token is automatically refreshed on login

### Issue: Images won't load
**Solution**:
- Verify the `design-images` bucket exists in Supabase Storage
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Ensure the image path exists in the database

### Issue: Quotes list is empty but you have quotes
**Solution**:
- Check browser console for API errors
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check Supabase logs for any RLS or permission issues

## Security Considerations

1. **Email Allowlist**: Always use `ADMIN_EMAIL_ALLOWLIST` in production
2. **HTTPS Only**: Never use the admin dashboard over HTTP
3. **Token Security**: Don't share your Netlify Identity token
4. **Regular Audits**: Review the admin user list regularly
5. **Private Buckets**: Keep `design-images` bucket private

## API Endpoints

The admin dashboard uses these Netlify Functions:

- `/.netlify/functions/admin-list-quotes` - List quotes (GET)
  - Query params: `limit`, `offset`, `status`
  - Requires: Authorization header with JWT token

- `/.netlify/functions/admin-update-quote` - Update quote (PATCH)
  - Body: `{ quoteId, status, adminNotes }`
  - Requires: Authorization header with JWT token

- `/.netlify/functions/admin-signed-image-url` - Get signed URL (POST)
  - Body: `{ quoteId }` or `{ imagePath }`
  - Requires: Authorization header with JWT token

## Maintenance

### Regular Tasks
- Review and respond to new quotes
- Update quote statuses as work progresses
- Add admin notes for internal tracking
- Clean up old signed URLs (they expire automatically)

### Periodic Tasks
- Audit admin user list
- Review `ADMIN_EMAIL_ALLOWLIST`
- Check Supabase storage usage
- Review Netlify function logs for errors

## Support

For issues or questions:
1. Check this guide first
2. Review Netlify and Supabase documentation
3. Check browser console for errors
4. Review server-side logs in Netlify dashboard
