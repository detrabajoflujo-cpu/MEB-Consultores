const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function generateLotesSeed() {
  const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await client.connect();

  const res = await client.query('SELECT * FROM lotes_historicos ORDER BY id ASC');
  
  const formatted = res.rows.map(r => ({
    id: r.id,
    nombre_completo: r.nombre_completo,
    curp: r.curp,
    nss: r.nss,
    banco: r.banco,
    clabe_interbancaria: r.clabe_interbancaria,
    monto_pension: r.monto_pension ? parseFloat(r.monto_pension) : null,
    numero_telefono: r.numero_telefono,
    estatus_original: r.estatus_original,
    sipre: r.sipre,
    capacidad_real: r.capacidad_real ? parseFloat(r.capacidad_real) : null,
    origen_archivo: r.origen_archivo
  }));

  const outPath = path.join(__dirname, 'frontend-react', 'src', 'services', 'lotesSeed.ts');
  const tsContent = `// Archivo autogenerado desde PostgreSQL\nexport const DB_LOTES_HISTORICOS = ${JSON.stringify(formatted, null, 2)};\n`;

  fs.writeFileSync(outPath, tsContent, 'utf-8');
  console.log(`OK — generado lotesSeed.ts con ${formatted.length} registros`);
  
  await client.end();
}

generateLotesSeed().catch(console.error);
