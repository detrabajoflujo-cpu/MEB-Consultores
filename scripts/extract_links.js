const ExcelJS = require('exceljs');
const { Client } = require('pg');
const path = require('path');

// Column mapping (1-indexed)
// 1=vacío, 2=NOMBRE, 3=CURP, 4=NSS, 5=BANCO, 6=CLABE, 7=PENSION, 8=AUMENTO
// 9=NUMERO, 10=CONTACTADO, 11=COMENTARIOS, 12=LINK DRIVE (nombre carpeta)
// 13=CORREO ELECTRONICO, 14=RETROACTIVO FICTICIO, 15=RETROACTIVO FINAL
// 16=LINK CONSTANCIA, 17=CORREO SIPRE, 18=PAGADO

function getCellVal(cell) {
  let val = cell.value;
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if (val.hyperlink) return val.hyperlink;
    if (val.text) return String(val.text);
    if (val.result !== undefined) return val.result;
    if (val.formula) return null; // formula without result
  }
  return String(val).trim() || null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'FERNANDA PALACIOS RIOS.xlsx'));
  const ws = wb.worksheets[0];

  // Build map: CURP -> { urlCarpetaDrive, linkConstancia }
  const links = {};
  let count = 0;

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const nombre = getCellVal(row.getCell(2));
    const curp = getCellVal(row.getCell(3));
    const linkDrive = getCellVal(row.getCell(12));   // LINK DRIVE (nombre o url)
    const linkConst = getCellVal(row.getCell(16));   // LINK CONSTANCIA

    if (!curp || curp.length < 10) return;
    if (!linkDrive && !linkConst) return;

    // Only take real Google Drive URLs from col 16 (constancia)
    const urlDrive = (linkConst && linkConst.startsWith('http')) ? linkConst : null;
    
    // Col 12 could be "Nombre/ CELDA X" text or a URL
    const urlCarpeta = (linkDrive && linkDrive.startsWith('http')) ? linkDrive : null;

    if (urlDrive || urlCarpeta) {
      links[curp.trim().toUpperCase()] = {
        nombre,
        urlCarpetaDrive: urlCarpeta,
        linkConstancia: urlDrive,
      };
      count++;
      console.log(`  → ${nombre} | Drive: ${urlCarpeta || '-'} | Constancia: ${urlDrive || '-'}`);
    }
  });

  console.log(`\nTotal con links: ${count}`);

  // Update PostgreSQL
  const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await client.connect();
  let updated = 0;

  for (const [curp, data] of Object.entries(links)) {
    // Get prospecto id by curp
    const res = await client.query('SELECT id FROM prospectos WHERE curp = $1', [curp]);
    if (res.rows.length === 0) {
      console.log(`  ⚠ No encontrado en DB: ${curp}`);
      continue;
    }
    const prospectoId = res.rows[0].id;

    // Update expediente
    const sets = [];
    const vals = [];
    let idx = 1;
    if (data.urlCarpetaDrive) { sets.push(`url_carpeta_drive = $${idx++}`); vals.push(data.urlCarpetaDrive); }
    if (data.linkConstancia)  { sets.push(`link_constancia = $${idx++}`);  vals.push(data.linkConstancia); }

    if (sets.length > 0) {
      vals.push(prospectoId);
      await client.query(
        `UPDATE expedientes SET ${sets.join(', ')}, fecha_ultima_actualizacion = NOW() WHERE prospecto_id = $${idx}`,
        vals
      );
      console.log(`  ✅ Actualizado: ${data.nombre}`);
      updated++;
    }
  }

  await client.end();
  console.log(`\n🎉 ${updated} expedientes actualizados con links de Drive`);
}

main().catch(console.error);
