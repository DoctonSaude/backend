const { Client } = require('pg');
const connectionString = "postgresql://postgres.ykilsibmhnctunafoayt:Docton%402026%2A%2A@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
const client = new Client({ connectionString });
client.connect()
  .then(() => { console.log('Connected to port 5432!'); client.end(); })
  .catch(err => { console.error('Error 5432:', err.message); });

const connectionString6543 = "postgresql://postgres.ykilsibmhnctunafoayt:Docton%402026%2A%2A@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const client6543 = new Client({ connectionString: connectionString6543 });
client6543.connect()
  .then(() => { console.log('Connected to port 6543!'); client6543.end(); })
  .catch(err => { console.error('Error 6543:', err.message); });
