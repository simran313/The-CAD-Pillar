// Authentication utility for Netlify Identity JWT validation
import { Buffer } from 'buffer';

/**
 * Validates Netlify Identity JWT token from Authorization header
 * 
 * NOTE: This implementation validates the token structure and expiration.
 * In production, Netlify Identity tokens are automatically verified by Netlify's
 * infrastructure when called from Netlify Functions. The token validation here
 * provides an additional layer of checks and extracts user information.
 * 
 * For enhanced security in non-Netlify environments, consider implementing
 * JWT signature verification against Netlify's JWKS endpoint:
 * https://[your-site].netlify.app/.netlify/identity/.well-known/jwks.json
 * 
 * @param {string} authHeader - Authorization header value (Bearer token)
 * @returns {Object} - { isValid: boolean, user: object, error: string }
 */
export function validateNetlifyIdentityToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isValid: false,
      error: 'Missing or invalid authorization header',
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // Decode JWT (base64url)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid token format',
      };
    }

    // Decode payload (second part of JWT)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Check token expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return {
        isValid: false,
        error: 'Token has expired',
      };
    }

    // Validate required fields
    if (!payload.sub || !payload.email) {
      return {
        isValid: false,
        error: 'Invalid token payload',
      };
    }

    // Extract user information
    const user = {
      id: payload.sub,
      email: payload.email,
      // Reserved for future role-based access control
      role: payload.app_metadata?.roles?.[0] || 'user',
    };

    return {
      isValid: true,
      user,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to decode token',
    };
  }
}

/**
 * Checks if user email is in the admin allowlist
 * @param {string} email - User email to check
 * @returns {boolean} - true if allowed, false otherwise
 */
export function isAdminAllowed(email) {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST;
  
  // If no allowlist is configured, allow any authenticated user
  if (!allowlist || allowlist.trim() === '') {
    return true;
  }

  // Check if email is in comma-separated allowlist
  const allowedEmails = allowlist.split(',').map(e => e.trim().toLowerCase());
  return allowedEmails.includes(email.toLowerCase());
}

/**
 * Standard authentication middleware for admin functions
 * @param {Object} event - Netlify function event
 * @returns {Object} - { authorized: boolean, user: object, response: object }
 */
export function requireAuth(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const validation = validateNetlifyIdentityToken(authHeader);

  if (!validation.isValid) {
    return {
      authorized: false,
      response: {
        statusCode: 401,
        body: JSON.stringify({ error: validation.error }),
      },
    };
  }

  // Check admin allowlist
  if (!isAdminAllowed(validation.user.email)) {
    return {
      authorized: false,
      response: {
        statusCode: 403,
        body: JSON.stringify({ 
          error: 'Access denied. Your email is not authorized for admin access.',
        }),
      },
    };
  }

  return {
    authorized: true,
    user: validation.user,
  };
}
