const { Client } = require('pg');
const connectionString = "postgresql://postgres:Docton%402026%2A%2A@db.ykilsibmhnctunafoayt.supabase.co:5432/postgres?sslmode=require";
const client = new Client({ connectionString });
client.connect()
  .then(() => { console.log('Connected directly to db!'); client.end(); })
  .catch(err => { console.error('Error connecting to db:', err.message); });
