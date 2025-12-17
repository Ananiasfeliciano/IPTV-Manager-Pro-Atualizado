// Minimal test script to POST to dev API
const url = process.env.TEST_URL || 'http://127.0.0.1:3001/api/ai';
const payload = {
  action: 'generatePersonalizedMessage',
  customerName: 'João',
  planName: 'Premium',
  price: 49.9,
  dueDate: '2025-12-20',
  daysDiff: -2,
  type: 'payment'
};

(async () => {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    console.log('Status:', resp.status);
    console.log('Body:', text);
    process.exit(resp.ok ? 0 : 1);
  } catch (e) {
    console.error('Test error:', e);
    process.exit(1);
  }
})();
