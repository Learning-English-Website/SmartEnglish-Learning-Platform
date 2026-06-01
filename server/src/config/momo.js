// MoMo Configuration - Direct API implementation
// IMPORTANT: Use environment variables for production!

const crypto = require('crypto');

const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint: process.env.MOMO_ENDPOINT || (process.env.NODE_ENV === 'production' 
    ? 'https://payment.momo.vn' 
    : 'https://test-payment.momo.vn'),
};

// HMAC SHA256 signing
function sign(data, secretKey) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(Buffer.from(data, 'utf-8'));
  return hmac.digest('hex');
}

// Create payment URL
async function createPayment(params) {
  const { orderId, amount, orderInfo, returnUrl, notifyUrl, extraData } = params;
  
  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    partnerName: 'SmartEnglish',
    storeId: 'SmartEnglish',
    requestId: orderId,
    amount: amount.toString(),
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: returnUrl,
    ipnUrl: notifyUrl,
    lang: 'vi',
    extraData: extraData || '',
    requestType: 'captureWallet',
  };

  // Create signature
  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${requestBody.amount}&extraData=${requestBody.extraData}&ipnUrl=${requestBody.ipnUrl}&orderId=${requestBody.orderId}&orderInfo=${requestBody.orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${requestBody.redirectUrl}&requestId=${requestBody.requestId}&requestType=${requestBody.requestType}`;
  requestBody.signature = sign(rawSignature, MOMO_CONFIG.secretKey);

  // Send request
  const response = await fetch(`${MOMO_CONFIG.endpoint}/v2/gateway/api/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  return data;
}

// Query transaction status
async function queryTransaction(orderId) {
  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    requestId: orderId,
    orderId: orderId,
    lang: 'vi',
  };

  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${orderId}`;
  requestBody.signature = sign(rawSignature, MOMO_CONFIG.secretKey);

  const response = await fetch(`${MOMO_CONFIG.endpoint}/v2/gateway/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  return await response.json();
}

// Verify webhook signature
function verifySignature(body) {
  const { signature, ...data } = body;
  const rawSignature = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');
  const expectedSignature = sign(rawSignature, MOMO_CONFIG.secretKey);
  return signature === expectedSignature;
}

module.exports = {
  MOMO_CONFIG,
  createPayment,
  queryTransaction,
  verifySignature,
};
