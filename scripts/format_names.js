const { Client } = require('pg');

function formatName(name) {
  if (!name) return name;
  // Convertimos a minúsculas, quitamos espacios dobles y capitalizamos cada palabra
  return name.trim().toLowerCase().replace(/\s+/g, ' ').split(' ').map(word => {
    if (word.length === 0) return word;
    // Manejar casos especiales como "de", "la", "del" en un futuro si es necesario
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

async function main() {
  const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await client.connect();

  let pCount = 0;
  const prospectos = await client.query('SELECT id, nombre_completo FROM prospectos');
  for (const row of prospectos.rows) {
    const formatted = formatName(row.nombre_completo);
    if (formatted !== row.nombre_completo) {
      await client.query('UPDATE prospectos SET nombre_completo = $1 WHERE id = $2', [formatted, row.id]);
      pCount++;
    }
  }

  let lCount = 0;
  const lotes = await client.query('SELECT id, nombre_completo FROM lotes_historicos');
  for (const row of lotes.rows) {
    const formatted = formatName(row.nombre_completo);
    if (formatted !== row.nombre_completo) {
      await client.query('UPDATE lotes_historicos SET nombre_completo = $1 WHERE id = $2', [formatted, row.id]);
      lCount++;
    }
  }

  console.log(`✅ Nombres formateados: ${pCount} prospectos y ${lCount} lotes históricos.`);
  await client.end();
}

main().catch(console.error);
