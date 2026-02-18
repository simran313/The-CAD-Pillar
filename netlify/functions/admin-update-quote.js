import { requireAuth } from './auth-utils.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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

  if (event.httpMethod !== 'PATCH') {
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
    const { quoteId, status, adminNotes } = JSON.parse(event.body);

    if (!quoteId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Quote ID is required' }),
      };
    }

    // Build update object with only provided fields
    const updateData = {};
    if (status !== undefined) {
      // Validate status values
      const validStatuses = ['pending', 'paid', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
          }),
        };
      }
      updateData.status = status;
    }
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Update quote in Supabase
    const response = await fetch(
      `${supabaseUrl}/rest/v1/cad_quotes?id=eq.${quoteId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      throw new Error('Failed to update quote');
    }

    const updatedQuotes = await response.json();

    if (updatedQuotes.length === 0) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Quote not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        quote: updatedQuotes[0],
      }),
    };
  } catch (error) {
    console.error('Error updating quote:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to update quote',
        details: error.message,
      }),
    };
  }
}
