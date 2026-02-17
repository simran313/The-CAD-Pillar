const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Server-side pricing calculation (same logic as client)
const priceRanges = {
  ring: { min: 35, max: 50 },
  pendant: { min: 80, max: 95 },
  bracelet: { min: 80, max: 95 },
  earrings: { min: 35, max: 50 },
  custom: { min: 50, max: 65 },
};

const stoneMultipliers = {
  '0-10': 1.0,
  '10-50': 1.2,
  '50-100': 1.4,
  '100+': 1.6,
};

const renderPrices = {
  1: 50,
  3: 70,
};

function calculateQuotePrice(quoteData) {
  const { designType, stones, addRender, renderTones } = quoteData;
  
  if (!designType || !stones || !priceRanges[designType] || !stoneMultipliers[stones]) {
    throw new Error('Invalid design type or stones selection');
  }

  const range = priceRanges[designType];
  const stoneMult = stoneMultipliers[stones];

  let priceMin = Math.round(range.min * stoneMult);
  let priceMax = Math.round(range.max * stoneMult);

  if (addRender && renderTones && renderPrices[renderTones]) {
    const renderPrice = renderPrices[renderTones];
    priceMin += renderPrice;
    priceMax += renderPrice;
  }

  return { priceMin, priceMax };
}

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
    const {
      email,
      fullName,
      phone,
      designType,
      stones,
      metal,
      delivery,
      addRender,
      renderTones,
      imageBase64,
    } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !fullName || !phone || !designType || !stones || !metal || !delivery) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Verify that this email has a verified OTP
    const otpCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_requests?email=eq.${encodeURIComponent(email)}&verified_at=not.is.null&order=verified_at.desc&limit=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!otpCheckResponse.ok) {
      throw new Error('Failed to verify OTP status');
    }

    const otpRecords = await otpCheckResponse.json();
    if (otpRecords.length === 0) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'OTP not verified. Please verify your email first.' }),
      };
    }

    // Calculate price server-side
    const { priceMin, priceMax } = calculateQuotePrice({
      designType,
      stones,
      addRender: Boolean(addRender),
      renderTones: renderTones ? parseInt(renderTones, 10) : null,
    });

    // Calculate deposit (50% of max price)
    const depositAmount = Math.round(priceMax * 0.5);

    // Upload image to Supabase Storage if provided
    let imagePath = null;
    if (imageBase64) {
      try {
        // Extract base64 data and mime type
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 image format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Determine file extension
        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
        else if (mimeType.includes('gif')) extension = 'gif';

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = `${timestamp}-${randomStr}.${extension}`;
        imagePath = `quotes/${filename}`;

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Upload to Supabase Storage
        const uploadResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/design-images/${imagePath}`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': mimeType,
            },
            body: buffer,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Storage upload error:', errorText);
          throw new Error('Failed to upload image');
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image rather than failing the entire request
        imagePath = null;
      }
    }

    // Insert quote into database
    const quoteData = {
      email,
      full_name: fullName,
      phone,
      design_type: designType,
      stones,
      metal,
      delivery,
      add_render: Boolean(addRender),
      render_tones: renderTones ? parseInt(renderTones, 10) : null,
      price_min: priceMin,
      price_max: priceMax,
      deposit_amount: depositAmount,
      image_path: imagePath,
      status: 'pending',
    };

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/cad_quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(quoteData),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Quote insert error:', errorText);
      throw new Error('Failed to save quote');
    }

    const [insertedQuote] = await insertResponse.json();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        quoteId: insertedQuote.id,
        priceMin,
        priceMax,
        depositAmount,
        paypalBusinessEmail: process.env.PAYPAL_BUSINESS_EMAIL,
      }),
    };
  } catch (error) {
    console.error('Error submitting quote:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to submit quote',
        details: error.message,
      }),
    };
  }
}
