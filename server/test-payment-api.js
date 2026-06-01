/**
 * Payment API Test Script
 * Run: node test-payment-api.js
 */

const API_BASE = 'http://localhost:5000/api';

// Test helper
async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}`);
    return result;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return null;
  }
}

// Get access token
async function getToken() {
  const email = 'admin@gmail.com';
  const password = 'Memoris123';
  
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json();
  console.log('   Login response keys:', Object.keys(data.data || {}));
  return data.data?.accessToken;
}

// ============================================
// TESTS
// ============================================

async function runTests() {
  console.log('🧪 Payment API Test Suite\n');
  console.log('='.repeat(50));
  
  // 1. Health check
  await test('1. Health Check', async () => {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check failed');
  });
  
  // 2. Get token
  const token = await test('2. Login & Get Token', async () => {
    const t = await getToken();
    if (!t) throw new Error('No token returned');
    console.log('   Token:', t.slice(0, 50) + '...');
    return t;
  });
  
  if (!token) {
    console.log('\n❌ Cannot proceed without token');
    return;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 3. Get payment methods
  await test('3. GET /payment/methods', async () => {
    const res = await fetch(`${API_BASE}/payment/methods`, { headers });
    const data = await res.json();
    console.log('   Methods:', JSON.stringify(data.data, null, 2));
    if (!data.success) throw new Error(data.error?.message);
  });
  
  // 4. Get subscription status
  await test('4. GET /payment/subscription', async () => {
    const res = await fetch(`${API_BASE}/payment/subscription`, { headers });
    const data = await res.json();
    console.log('   Status:', JSON.stringify(data.data));
    if (!data.success) throw new Error(data.error?.message);
  });
  
  // 5. Create MoMo payment
  await test('5. POST /payment/checkout (MoMo)', async () => {
    const res = await fetch(`${API_BASE}/payment/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'momo' }),
    });
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data).slice(0, 400));
    if (!data.success) throw new Error(data.error?.message);
    return data.data;
  });
  
  // 6. Create PayOS payment
  await test('6. POST /payment/checkout (PayOS)', async () => {
    const res = await fetch(`${API_BASE}/payment/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method: 'payos' }),
    });
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data).slice(0, 400));
    if (!data.success) throw new Error(data.error?.message);
    return data.data;
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

runTests().catch(console.error);
