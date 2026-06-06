import fetch from 'node-fetch';

fetch('http://localhost:5180/api/admin/reports/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'users' })
})
.then(r => r.json())
.then(console.log);
