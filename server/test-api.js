const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
      },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  // Test 1: validation error (empty body)
  console.log('\n--- Test: validation error ---');
  const t1 = await post('/api/auth/register', {});
  console.log(t1.status, JSON.stringify(t1.body));

  // Test 2: register with data
  console.log('\n--- Test: register ---');
  const t2 = await post('/api/auth/register', {
    email: 'devtest01@memoris.dev',
    username: 'devtest01',
    password: 'DevTest123',
  });
  console.log(t2.status, JSON.stringify(t2.body));
}

run().catch(console.error);
