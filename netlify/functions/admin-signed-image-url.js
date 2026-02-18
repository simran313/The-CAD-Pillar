import { requireAuth } from './auth-utils.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Authenticate user
  const auth = requireAuth(event);
  if (!auth.authorized) {
    return {
      ...auth.response,
      headers: { ...auth.response.headers, ...CORS_HEADERS },
    };
  }

  try {
    const { quoteId, imagePath } = JSON.parse(event.body);

    let finalImagePath = imagePath;

    // If quoteId is provided, fetch the image_path from the database
    if (quoteId && !imagePath) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/cad_quotes?id=eq.${quoteId}&select=image_path`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const quotes = await response.json();

      if (quotes.length === 0) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Quote not found' }),
        };
      }

      finalImagePath = quotes[0].image_path;
    }

    if (!finalImagePath) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No image associated with this quote' }),
      };
    }

    // Generate signed URL for the image (valid for 1 hour)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const signedUrlResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/design-images/${finalImagePath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          expiresIn: 3600, // 1 hour in seconds
        }),
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('Signed URL error:', errorText);
      throw new Error('Failed to generate signed URL');
    }

    const signedUrlData = await signedUrlResponse.json();

    // Construct the full signed URL
    const signedUrl = `${supabaseUrl}/storage/v1${signedUrlData.signedURL}`;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        signedUrl,
        expiresIn: 3600,
      }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to generate signed URL',
        details: error.message,
      }),
    };
  }
}
