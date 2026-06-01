// PayOS Configuration - Direct API implementation
// IMPORTANT: Use environment variables for production!

const crypto = require('crypto');

const PAYOS_CONFIG = {
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  // IMPORTANT: Correct API endpoint (must include -merchant)
  endpoint: 'https://api-merchant.payos.vn',
};

// Create HMAC SHA256 signature - EXACT format PayOS expects
function createSignature(data, checksumKey) {
  // PayOS signature format: key=value&key=value (sorted alphabetically)
  const rawData = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');
  return crypto.createHmac('sha256', checksumKey).update(rawData).digest('hex');
}

// Create payment link
async function createPaymentLink(params) {
  const { orderCode, amount, description, returnUrl, cancelUrl } = params;
  
  // IMPORTANT: Only include these 5 fields for signature (as per PayOS docs)
  const signatureData = {
    orderCode: orderCode.toString(),
    amount: amount.toString(),
    description,
    returnUrl,
    cancelUrl,
  };

  const signature = createSignature(signatureData, PAYOS_CONFIG.checksumKey);

  // IMPORTANT: Correct headers (lowercase)
  const response = await fetch(`${PAYOS_CONFIG.endpoint}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': PAYOS_CONFIG.clientId,
      'x-api-key': PAYOS_CONFIG.apiKey,
    },
    body: JSON.stringify({
      orderCode: Number(orderCode),
      amount: Number(amount),
      description,
      returnUrl,
      cancelUrl,
      signature,
    }),
  });

  return await response.json();
}

// Verify webhook signature
function verifySignature(body, checksumKey) {
  // For webhook, PayOS sends signature computed over the JSON body
  const dataString = JSON.stringify(body);
  const expectedSignature = crypto.createHmac('sha256', checksumKey)
    .update(dataString)
    .digest('hex');
  return body.signature === expectedSignature;
}

// Query payment link information
async function getPaymentLinkInformation(orderCode) {
  const response = await fetch(`${PAYOS_CONFIG.endpoint}/v2/payment-requests/${orderCode}`, {
    method: 'GET',
    headers: {
      'x-client-id': PAYOS_CONFIG.clientId,
      'x-api-key': PAYOS_CONFIG.apiKey,
    },
  });
  return await response.json();
}

module.exports = {
  PAYOS_CONFIG,
  createPaymentLink,
  verifySignature,
  getPaymentLinkInformation,
};
