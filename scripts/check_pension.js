const { Client } = require('pg');

async function main() {
  const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await client.connect();

  const res = await client.query(`
    SELECT p.nombre_completo, e.monto_pension_actual, e.aumento_pension, e.retroactivo_ficticio, e.retroactivo_final 
    FROM prospectos p 
    JOIN expedientes e ON p.id = e.prospecto_id 
    WHERE p.nombre_completo ILIKE '%gerardo menendez%';
  `);
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
