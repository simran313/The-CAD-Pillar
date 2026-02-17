import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handler(event) {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, otp } = JSON.parse(event.body);

    if (!email || !otp) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Email and OTP are required' }),
      };
    }

    // Hash the provided OTP
    const otpHash = crypto
      .createHash('sha256')
      .update(`${email}:${otp}`)
      .digest('hex');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Fetch the latest unverified OTP request for this email
    const fetchResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_requests?email=eq.${encodeURIComponent(email)}&verified_at=is.null&order=created_at.desc&limit=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      throw new Error('Failed to fetch OTP request');
    }

    const otpRequests = await fetchResponse.json();

    if (otpRequests.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No OTP request found. Please request a new OTP.' }),
      };
    }

    const otpRequest = otpRequests[0];

    // Check if OTP has expired
    if (new Date(otpRequest.expires_at) < new Date()) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'OTP has expired. Please request a new one.' }),
      };
    }

    // Check max attempts
    if (otpRequest.attempts >= 5) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Maximum attempts exceeded. Please request a new OTP.' }),
      };
    }

    // Verify OTP hash
    if (otpRequest.otp_hash !== otpHash) {
      // Increment attempts
      await fetch(`${supabaseUrl}/rest/v1/otp_requests?id=eq.${otpRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          attempts: otpRequest.attempts + 1,
        }),
      });

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'Invalid OTP. Please try again.',
          attemptsRemaining: 5 - (otpRequest.attempts + 1),
        }),
      };
    }

    // Mark as verified
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/otp_requests?id=eq.${otpRequest.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        verified_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update OTP request');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true,
        message: 'OTP verified successfully',
      }),
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to verify OTP',
        details: error.message,
      }),
    };
  }
}
