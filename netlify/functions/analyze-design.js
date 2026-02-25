// ============================================================
// analyze-design.js
// Netlify Function: POST /.netlify/functions/analyze-design
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Price ranges per category (USD)
const PRICE_RANGES = {
  ring:      { min: 35,  max: 140 },
  pendant:   { min: 45,  max: 180 },
  bracelet:  { min: 40,  max: 140 },
  earrings:  { min: 40,  max: 120 },
  custom:    { min: 40,  max: 170 },
};

// Render add-on prices
const RENDER_PRICES = { 1: 50, 3: 70 };

// How wide the min-max gap is, based on complexity
function getPriceGap(score) {
  if (score <= 40) return 8;
  if (score <= 70) return 12;
  return 18;
}

function getComplexityLabel(score) {
  if (score <= 40) return 'simple';
  if (score <= 70) return 'medium';
  return 'complex';
}

function calculatePrice(category, complexityScore, addRender, renderTones) {
  const range = PRICE_RANGES[category];
  if (!range) throw new Error('Unknown category: ' + category);

  const spread = range.max - range.min;
  const position = (complexityScore / 100) * spread;
  const gap = getPriceGap(complexityScore);

  let priceMin = Math.round(range.min + position);
  let priceMax = Math.min(priceMin + gap, range.max);

  if (addRender && renderTones && RENDER_PRICES[renderTones]) {
    priceMin += RENDER_PRICES[renderTones];
    priceMax += RENDER_PRICES[renderTones];
  }

  return { priceMin, priceMax };
}

async function fetchReferenceImages(category, supabaseUrl, supabaseKey) {
  const url =
    supabaseUrl +
    '/rest/v1/reference_designs' +
    '?category=eq.' + encodeURIComponent(category) +
    '&select=image_url,complexity,file_name' +
    '&order=complexity.asc';

  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error('Failed to fetch reference images: ' + text);
  }

  return response.json();
}

async function analyzeWithGPT4o(customerImageBase64, referenceImages, category, openaiKey) {
  // Pick up to 3 examples per complexity tier for the prompt
  const simple  = referenceImages.filter(r => r.complexity === 'simple').slice(0, 3);
  const medium  = referenceImages.filter(r => r.complexity === 'medium').slice(0, 3);
  const complex = referenceImages.filter(r => r.complexity === 'complex').slice(0, 3);
  const sampleRefs = [...simple, ...medium, ...complex];

  // Build the reference image content blocks
  const referenceContent = sampleRefs.flatMap(ref => [
    { type: 'text', text: `Reference (${ref.complexity} ${category}):` },
    { type: 'image_url', image_url: { url: ref.image_url, detail: 'low' } },
  ]);

  const systemPrompt =
    'You are an expert jewellery CAD complexity assessor. ' +
    'Score the customer design from 0 to 100 based on: ' +
    'number of design elements, stone setting complexity, filigree/engraving work, ' +
    'structural complexity, and fine surface details. ' +
    '0 = simplest possible design, 100 = most complex design possible. ' +
    'Return ONLY valid JSON in this exact format: ' +
    '{"complexity_score":<integer 0-100>,"complexity_label":"simple|medium|complex","confidence":<integer 0-100>,"reasoning":"<1-2 sentences>"}';

  const userContent = [
    {
      type: 'text',
      text:
        `Please assess the complexity of this ${category} design. ` +
        'Score it from 0 (simplest) to 100 (most complex).',
    },
    {
      type: 'image_url',
      image_url: { url: customerImageBase64, detail: 'high' },
    },
    {
      type: 'text',
      text: 'Here are reference images to calibrate your score:',
    },
    ...referenceContent,
  ];

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + openaiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    throw new Error('OpenAI API error: ' + errText);
  }

  const data = await openaiResponse.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from GPT-4o');

  try {
    return JSON.parse(content.trim());
  } catch {
    // Try to extract JSON if there is extra prose around it
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse GPT-4o response as JSON: ' + content);
  }
}

export async function handler(event) {
  // ---------- preflight ----------
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { imageBase64, category, addRender, renderTones } = JSON.parse(event.body);

    // ---------- validation ----------
    if (!imageBase64 || !category) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'imageBase64 and category are required' }),
      };
    }

    if (!PRICE_RANGES[category]) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid category: ' + category }),
      };
    }

    // ---------- env vars ----------
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey   = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }),
      };
    }

    // ---------- fetch reference images ----------
    const referenceImages = await fetchReferenceImages(category, supabaseUrl, supabaseKey);

    if (referenceImages.length === 0) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'No reference images found for category "' + category + '". Run the seed script first.',
        }),
      };
    }

    // ---------- GPT-4o Vision analysis ----------
    const aiResult = await analyzeWithGPT4o(imageBase64, referenceImages, category, openaiKey);

    const {
      complexity_score,
      complexity_label,
      confidence,
      reasoning,
    } = aiResult;

    // ---------- price calculation ----------
    const { priceMin, priceMax } = calculatePrice(
      category,
      complexity_score,
      Boolean(addRender),
      renderTones ? parseInt(renderTones, 10) : null
    );

    const depositAmount = Math.round(priceMax * 0.5);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        complexityScore:  complexity_score,
        complexityLabel:  complexity_label || getComplexityLabel(complexity_score),
        confidence,
        reasoning,
        priceMin,
        priceMax,
        depositAmount,
      }),
    };
  } catch (error) {
    console.error('analyze-design error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to analyse design',
        details: error.message,
      }),
    };
  }
}