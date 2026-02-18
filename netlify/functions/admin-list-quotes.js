import { requireAuth } from './auth-utils.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
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
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || '50', 10);
    const offset = parseInt(params.offset || '0', 10);
    const status = params.status || null;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Build query with filters
    let query = `${supabaseUrl}/rest/v1/cad_quotes?order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (status && status !== 'all') {
      query += `&status=eq.${encodeURIComponent(status)}`;
    }

    // Fetch quotes from Supabase
    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      throw new Error('Failed to fetch quotes');
    }

    const quotes = await response.json();
    
    // Get total count from Content-Range header
    const contentRange = response.headers.get('content-range');
    let total = quotes.length;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        total = parseInt(match[1], 10);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        quotes,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + quotes.length < total,
        },
      }),
    };
  } catch (error) {
    console.error('Error listing quotes:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to list quotes',
        details: error.message,
      }),
    };
  }
}
