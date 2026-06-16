const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres.ykilsibmhnctunafoayt:Docton.2026%2A%2A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query('UPDATE "Patient" SET "healthPoints" = 5000;'))
  .then(() => console.log('Updated patients successfully!'))
  .catch(console.error)
  .finally(() => client.end());
