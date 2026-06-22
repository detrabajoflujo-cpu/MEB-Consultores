const { Client } = require('pg');

async function fixMillions() {
  const c = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });
  await c.connect();

  const res = await c.query('SELECT p.id as pid, e.id as eid, p.nombre_completo, e.monto_pension_actual, e.aumento_pension, p.telefono_contacto FROM prospectos p JOIN expedientes e ON p.id=e.prospecto_id WHERE e.monto_pension_actual > 1000000');
  
  let fixed = 0;
  for (const row of res.rows) {
    const realPhone = String(row.monto_pension_actual).replace('.00', '');
    const realPension = row.aumento_pension; // 6963.27
    
    // Update prospecto
    await c.query('UPDATE prospectos SET telefono_contacto = $1 WHERE id = $2', [realPhone, row.pid]);
    
    // Update expediente
    await c.query('UPDATE expedientes SET monto_pension_actual = $1, aumento_pension = null WHERE id = $2', [realPension, row.eid]);
    
    fixed++;
    console.log(`Arreglado: ${row.nombre_completo} -> Tel: ${realPhone}, Pension: ${realPension}`);
  }

  // Also apply the manual patches the user asked for in their screenshot for the Lote C records that were imported into prospectos
  await c.query('UPDATE expedientes e SET monto_pension_actual = 8963.27 FROM prospectos p WHERE p.id = e.prospecto_id AND p.nombre_completo ILIKE \'%PAZ ZARZA%\'');
  await c.query('UPDATE expedientes e SET monto_pension_actual = 8510.27 FROM prospectos p WHERE p.id = e.prospecto_id AND p.nombre_completo ILIKE \'%SOLEDAD MADRIGAL%\'');

  await c.end();
  console.log(`Se arreglaron ${fixed} prospectos con millones.`);
}

fixMillions().catch(console.error);
