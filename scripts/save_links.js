const ExcelJS = require('exceljs');
const { Client } = require('pg');
const path = require('path');

// CONFIRMED column map:
// Col 1=NOMBRE, Col 2=CURP, Col 3=NSS, Col 11=LINK DRIVE (hyperlink), Col 15=LINK CONSTANCIA (hyperlink)

function getHyperlink(cell) {
  if (cell.hyperlink && cell.hyperlink.includes('http')) return cell.hyperlink;
  const val = cell.value;
  if (val && typeof val === 'object' && val.hyperlink && val.hyperlink.includes('http')) return val.hyperlink;
  if (typeof val === 'string' && val.includes('http')) return val;
  return null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'FERNANDA PALACIOS RIOS.xlsx'));
  const ws = wb.worksheets[0];

  const links = {};

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;

    const nombre = row.getCell(1).value;
    const curpRaw = row.getCell(2).value;
    if (!curpRaw || typeof curpRaw !== 'string') return;
    const curp = curpRaw.trim().toUpperCase();
    if (curp.length < 10 || curp === 'CURP') return;

    const urlCarpeta   = getHyperlink(row.getCell(11));
    const urlConstancia = getHyperlink(row.getCell(15));

    if (urlCarpeta || urlConstancia) {
      links[curp] = { nombre, urlCarpeta, urlConstancia };
      console.log(`  ${String(nombre).slice(0,30).padEnd(30)} | Carpeta: ${urlCarpeta ? '✓' : '—'} | Constancia: ${urlConstancia ? '✓' : '—'}`);
    }
  });

  console.log(`\nTotal links encontrados: ${Object.keys(links).length}`);

  // Update PostgreSQL
  const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await client.connect();
  let updated = 0;

  for (const [curp, data] of Object.entries(links)) {
    const res = await client.query('SELECT id FROM prospectos WHERE curp = $1', [curp]);
    if (res.rows.length === 0) {
      console.log(`  ⚠ No en DB: ${curp} (${data.nombre})`);
      continue;
    }
    const pid = res.rows[0].id;

    const parts = [];
    const vals = [];
    let i = 1;
    if (data.urlCarpeta)    { parts.push(`url_carpeta_drive = $${i++}`); vals.push(data.urlCarpeta); }
    if (data.urlConstancia) { parts.push(`link_constancia = $${i++}`);   vals.push(data.urlConstancia); }
    parts.push('fecha_ultima_actualizacion = NOW()');
    vals.push(pid);

    await client.query(
      `UPDATE expedientes SET ${parts.join(', ')} WHERE prospecto_id = $${i}`,
      vals
    );
    updated++;
    console.log(`  ✅ ${data.nombre}`);
  }

  console.log(`\n🎉 ${updated} expedientes actualizados en PostgreSQL`);
  await client.end();
}

main().catch(console.error);
