// ============================================================
// ONE-TIME SEED SCRIPT
// Run this ONCE via: POST /.netlify/functions/seed-reference-images
// It reads your Google Drive public folder and inserts records
// into the reference_designs table in Supabase.
//
// IMPORTANT: Delete or disable this function after seeding!
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================
// YOUR GOOGLE DRIVE FOLDER ID
// Extract from your share link:
// https://drive.google.com/drive/folders/FOLDER_ID_HERE
// ============================================================
const GOOGLE_DRIVE_FOLDER_ID = '1lqh-__OXspoQFWnThUgwyhFYvzf6p4Pz';

// ============================================================
// REFERENCE IMAGE MANIFEST
// Since Google Drive public folders can't be listed via API
// without OAuth, we define the structure here matching your
// exact folder/file naming convention.
// Update counts to match your actual files.
// ============================================================
const MANIFEST = {
  ring: {
    simple:  7,
    medium:  5,
    complex: 5,
  },
  bracelet: {
    simple:  4,
    medium:  3,
    complex: 4,
  },
  necklace: {
    simple:  6,
    medium:  6,
    complex: 4,
  },
  earrings: {
    simple:  4,
    medium:  5,
    complex: 4,
  },
};

// Build Google Drive direct image URL from file name
// This uses the folder structure: category/complexity/filename
// We search the public folder for matching files
function buildGoogleDriveSearchUrl(fileName) {
  // Direct thumbnail/view URL pattern for Google Drive shared files
  // We'll store the search name and the parent folder ID
  return `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;
}

// Build a direct viewable URL for a Google Drive file by its name pattern
// Since files are publicly shared in a known folder structure,
// we generate the expected file URLs using the Google Drive API v3
async function getFileIdFromDrive(category, complexity, index, apiKey) {
  const fileName = `${category}-${complexity}-${index}`;
  
  // Search in the parent folder for this file name
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name+contains+'${fileName}'+and+'${GOOGLE_DRIVE_FOLDER_ID}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType)&includeItemsFromAllDrives=true&supportsAllDrives=true`;
  
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Google Drive API error for ${fileName}`);
  }
  
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function handler(event) {
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;

  if (!googleApiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'GOOGLE_API_KEY environment variable not set.',
        help: 'Add a Google API key with Drive API enabled to your Netlify environment variables.',
      }),
    };
  }

  const results = [];
  const errors = [];
  const records = [];

  // Loop through manifest and fetch file IDs from Google Drive
  for (const [category, complexities] of Object.entries(MANIFEST)) {
    for (const [complexity, count] of Object.entries(complexities)) {
      for (let i = 1; i <= count; i++) {
        const fileName = `${category}-${complexity}-${i}`;
        try {
          const fileId = await getFileIdFromDrive(category, complexity, i, googleApiKey);
          if (fileId) {
            // Direct image URL for public Google Drive files
            const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
            records.push({
              category,
              complexity,
              file_name: fileName,
              image_url: imageUrl,
            });
            results.push(`✅ Found: ${fileName} → ${fileId}`);
          } else {
            errors.push(`⚠️ Not found: ${fileName}`);
          }
        } catch (err) {
          errors.push(`❌ Error fetching ${fileName}: ${err.message}`);
        }
      }
    }
  }

  if (records.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'No images found. Check your Google Drive folder ID and API key.',
        errors,
      }),
    };
  }

  // Clear existing reference_designs records first
  const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/reference_designs?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  });

  // Insert all records into Supabase
  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/reference_designs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(records),
  });

  if (!insertResponse.ok) {
    const errText = await insertResponse.text();
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to insert records into Supabase',
        details: errText,
        found: results,
        errors,
      }),
    };
  }

  const inserted = await insertResponse.json();

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      message: `Successfully seeded ${inserted.length} reference images`,
      breakdown: {
        ring: records.filter(r => r.category === 'ring').length,
        bracelet: records.filter(r => r.category === 'bracelet').length,
        necklace: records.filter(r => r.category === 'necklace').length,
        earrings: records.filter(r => r.category === 'earrings').length,
      },
      found: results,
      errors,
    }),
  };
}