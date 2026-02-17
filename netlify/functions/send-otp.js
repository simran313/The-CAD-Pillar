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
    const { email } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Valid email is required' }),
      };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP as sha256(email:otp)
    const otpHash = crypto
      .createHash('sha256')
      .update(`${email}:${otp}`)
      .digest('hex');

    // Store in Supabase
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/otp_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      }),
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('Supabase error:', errorText);
      throw new Error('Failed to store OTP');
    }

    // Send OTP via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: email,
          },
        ],
        subject: 'Your CAD Quote Calculator Verification Code',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #0EA5E9; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">The CAD Pillar</h1>
                <p style="margin: 10px 0 0 0;">Email Verification</p>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for requesting a CAD quote. Please use the following verification code to complete your request:</p>
                <div class="otp-code">${otp}</div>
                <p><strong>This code will expire in 10 minutes.</strong></p>
                <p>If you didn't request this code, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} The CAD Pillar. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('Brevo error:', errorText);
      throw new Error('Failed to send email');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: true,
        message: 'OTP sent successfully',
      }),
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Failed to send OTP',
        details: error.message,
      }),
    };
  }
}
