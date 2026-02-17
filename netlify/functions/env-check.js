export async function handler() {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "BREVO_SENDER_NAME",
    "PAYPAL_BUSINESS_EMAIL",
  ];

  const present = Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k])]));

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ present }, null, 2),
  };
}
