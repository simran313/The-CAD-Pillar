# Admin Dashboard Testing Guide

This guide provides step-by-step testing procedures for the Admin Dashboard.

## Prerequisites

Before testing:
- [ ] Database migration completed (`supabase/admin-dashboard-migration.sql`)
- [ ] Netlify Identity enabled
- [ ] `ADMIN_EMAIL_ALLOWLIST` environment variable configured
- [ ] At least one admin user invited via Netlify
- [ ] Code deployed to Netlify

## Test 1: Unauthenticated Access (Security Test)

**Purpose**: Verify that unauthenticated users cannot access admin functions.

### Steps:
1. Open browser developer console (F12)
2. Navigate to: `https://your-site.netlify.app/admin/`
3. Try to call admin API directly:
   ```javascript
   fetch('/.netlify/functions/admin-list-quotes')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

### Expected Results:
- ✅ Admin page shows login screen
- ✅ API call returns 401 Unauthorized
- ✅ Response contains error message about missing authorization

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 2: Authentication Flow

**Purpose**: Verify Netlify Identity login works correctly.

### Steps:
1. Navigate to: `https://your-site.netlify.app/admin/`
2. Click "Sign In with Netlify Identity"
3. Enter credentials for invited admin user
4. Complete authentication

### Expected Results:
- ✅ Netlify Identity modal appears
- ✅ Login form accepts credentials
- ✅ After successful login, redirected to dashboard
- ✅ User email appears in header
- ✅ Quote list loads automatically

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 3: Email Allowlist (Authorization Test)

**Purpose**: Verify that only allowlisted emails can access admin functions.

### Steps:
1. Invite a user whose email is NOT in `ADMIN_EMAIL_ALLOWLIST`
2. Have them log in to admin dashboard
3. Observe behavior

### Expected Results:
- ✅ Login succeeds (Netlify Identity works)
- ✅ When trying to load quotes, receive 403 Forbidden error
- ✅ Error message explains email not authorized

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________
- [ ] Skipped (no allowlist configured)

---

## Test 4: Quote Listing

**Purpose**: Verify quote listing and pagination works.

### Prerequisites:
- Have at least 3 quotes in the database

### Steps:
1. Log in to admin dashboard
2. Observe quote list
3. Check pagination controls
4. Try different page sizes if possible

### Expected Results:
- ✅ Quotes appear in table
- ✅ Shows: date, customer, design type, price range, status
- ✅ Ordered by created_at descending (newest first)
- ✅ Pagination shows correct counts
- ✅ Previous/Next buttons work correctly

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

### Sample Data Observed:
| Date | Customer | Design Type | Price Range | Status |
|------|----------|-------------|-------------|--------|
|      |          |             |             |        |
|      |          |             |             |        |

---

## Test 5: Status Filtering

**Purpose**: Verify client-side status filtering works.

### Steps:
1. Log in to admin dashboard
2. Select "Pending" from status filter
3. Observe quote list
4. Try other status values

### Expected Results:
- ✅ Filtering happens instantly (client-side)
- ✅ Only quotes with selected status appear
- ✅ "All Statuses" shows all quotes
- ✅ Count updates correctly

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 6: Quote Details Modal

**Purpose**: Verify quote details display correctly.

### Steps:
1. Log in to admin dashboard
2. Click "View Details" on any quote
3. Observe modal content

### Expected Results:
- ✅ Modal opens with quote details
- ✅ Shows all fields: customer info, quote details, pricing
- ✅ Status dropdown shows current status
- ✅ Admin notes textarea exists (may be empty)
- ✅ Close button works

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 7: Update Quote Status

**Purpose**: Verify quote status updates work.

### Steps:
1. Log in to admin dashboard
2. Open quote details for any quote
3. Change status dropdown to different value
4. Click "Update Quote"
5. Wait for feedback
6. Close modal and check quote list

### Expected Results:
- ✅ Shows "Updating quote..." loading message
- ✅ Shows "✓ Quote updated successfully!" on success
- ✅ Modal closes automatically after 1 second
- ✅ Quote list refreshes
- ✅ Updated status appears in quote list

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

### Test Data:
- Original Status: ___________
- New Status: ___________
- Update Time: ___________

---

## Test 8: Update Admin Notes

**Purpose**: Verify admin notes can be saved.

### Steps:
1. Log in to admin dashboard
2. Open quote details
3. Add/edit text in Admin Notes textarea
4. Click "Update Quote"
5. Close modal
6. Re-open same quote details

### Expected Results:
- ✅ Notes save successfully
- ✅ Notes persist after closing and reopening
- ✅ Special characters handled correctly
- ✅ Multi-line text preserved

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

### Test Notes:
```
(Paste the test notes you entered here)
```

---

## Test 9: Image Viewing (Signed URLs)

**Purpose**: Verify signed URL generation for images.

### Prerequisites:
- Have at least one quote with an uploaded image

### Steps:
1. Log in to admin dashboard
2. Open quote details for quote with image
3. Click "View / Download Image"
4. Observe behavior

### Expected Results:
- ✅ Shows "Loading image..." message briefly
- ✅ Image opens in new browser tab
- ✅ Image also previews in modal
- ✅ URL contains `signedURL` parameter
- ✅ URL works and displays image

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

### Image URL (partial):
```
https://...supabase.co/storage/v1/object/sign/design-images/...
```

---

## Test 10: Signed URL Expiration

**Purpose**: Verify signed URLs expire after 1 hour.

### Steps:
1. Generate a signed URL for an image
2. Copy the URL
3. Wait 61 minutes (or use time manipulation if available)
4. Try to access the URL

### Expected Results:
- ✅ URL works immediately after generation
- ✅ URL returns 403/401 error after expiration
- ✅ Error message indicates expired signature

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________
- [ ] Skipped (can't wait 1 hour)

---

## Test 11: Token Expiration Handling

**Purpose**: Verify behavior when JWT token expires.

### Steps:
1. Log in to admin dashboard
2. Wait for token to expire (varies, typically 1 hour)
3. Try to perform an action (list quotes, update, etc.)

### Expected Results:
- ✅ Receives "Token has expired" error
- ✅ User sees error message
- ✅ Can log out and back in to refresh token

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________
- [ ] Skipped (can't wait for expiration)

---

## Test 12: Error Handling

**Purpose**: Verify graceful error handling.

### Steps:
1. Test various error scenarios:
   - Invalid quote ID
   - Network error (disconnect network briefly)
   - Malformed request
2. Observe error messages

### Expected Results:
- ✅ Errors show inline messages (not browser alerts)
- ✅ Error messages are descriptive
- ✅ UI remains functional after errors
- ✅ Can retry failed operations

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 13: Responsive Design

**Purpose**: Verify dashboard works on different screen sizes.

### Steps:
1. Open admin dashboard on desktop
2. Resize browser to tablet size
3. Resize to mobile size
4. Test functionality at each size

### Expected Results:
- ✅ Layout adjusts to screen size
- ✅ Table scrolls horizontally on mobile if needed
- ✅ Modal is usable on all screen sizes
- ✅ All buttons remain clickable

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 14: Multiple Quote Operations

**Purpose**: Verify dashboard handles multiple operations correctly.

### Steps:
1. Log in to admin dashboard
2. Update 3 different quotes in succession
3. Generate signed URLs for multiple images
4. Filter by different statuses

### Expected Results:
- ✅ All operations complete successfully
- ✅ No data corruption
- ✅ No memory leaks or performance issues
- ✅ UI remains responsive

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Test 15: Public Site Verification

**Purpose**: Verify existing public site functionality unchanged.

### Steps:
1. Navigate to main site (not /admin/)
2. Complete a quote submission:
   - Fill out form
   - Upload image
   - Request OTP
   - Verify OTP
   - Submit quote
3. Check PayPal integration

### Expected Results:
- ✅ Quote submission works as before
- ✅ OTP flow unchanged
- ✅ Image upload works
- ✅ PayPal link generates correctly
- ✅ No errors in console
- ✅ Quote appears in admin dashboard

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue): ___________

---

## Performance Testing

### Load Times
- Admin page load: _______ ms
- Quote list API: _______ ms
- Update quote API: _______ ms
- Signed URL generation: _______ ms

### Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Security Summary

After completing all tests:

### Security Checklist
- [ ] Unauthenticated access blocked ✓
- [ ] JWT validation working ✓
- [ ] Email allowlist enforced ✓
- [ ] Signed URLs expire correctly ✓
- [ ] No XSS vulnerabilities ✓
- [ ] No SQL injection possible ✓
- [ ] No sensitive data in console ✓
- [ ] HTTPS only (production) ✓

---

## Issues Found

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |

---

## Final Approval

- [ ] All tests passed
- [ ] All security checks passed
- [ ] Documentation reviewed
- [ ] Ready for production

**Tested By**: ___________  
**Date**: ___________  
**Environment**: ___________  
**Version/Commit**: ___________

---

## Notes

(Add any additional observations or comments here)
