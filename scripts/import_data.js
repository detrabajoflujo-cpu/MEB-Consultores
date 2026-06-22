const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'crm_db',
  user: 'crm_user',
  password: 'crm_pass',
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function cleanMoney(s) {
  if (!s || s.trim() === '' || s.trim() === '-') return null;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function cleanPhone(s) {
  if (!s) return null;
  return s.replace(/\s+/g, '').replace(/[^0-9+]/g, '').slice(0, 15);
}

function cleanNSS(s) {
  if (!s) return null;
  // Remove slashes, dashes, spaces, and keep only digits
  const clean = s.replace(/[^0-9]/g, '');
  return clean.length > 0 ? clean : null;
}

function cleanCURP(s) {
  if (!s) return null;
  return s.trim().toUpperCase().slice(0, 18);
}

function parseBool(s) {
  if (!s) return false;
  return s.toString().toUpperCase() === 'TRUE' || s === '1';
}

function mapEstatus(s) {
  if (!s) return 'NUEVO';
  const u = s.toUpperCase();
  if (u.includes('DOMICILIADO')) return 'FORMALIZADO';
  if (u.includes('VIABLE')) return 'VIABLE';
  if (u.includes('COMPLETO')) return 'FORMALIZADO';
  if (u.includes('EN_PROCESO') || u.includes('EN PROCESO')) return 'EN_PROCESO';
  if (u.includes('VALIDANDO')) return 'VALIDANDO';
  if (u.includes('RECHAZADO') || u.includes('DESCARTADO')) return 'RECHAZADO';
  return 'NUEVO';
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, { encoding: 'latin1' });
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''));
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV parse handling quoted fields
    const cols = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ─────────────────────────────────────────────
// IMPORT FERNANDA PALACIOS → prospectos + expedientes
// ─────────────────────────────────────────────
async function importFernanda() {
  console.log('\n📥 Importando FERNANDA PALACIOS RIOS...');
  const rows = parseCSV(path.join(__dirname, 'FERNANDA PALACIOS RIOS - Hoja 1.csv'));
  
  let inserted = 0, skipped = 0, errors = 0;
  
  // Find the header row (contains "NOMBRE" or "CURP")
  let dataRows = rows.filter(r => {
    const first = (r[0] || '').toUpperCase();
    const second = (r[1] || '').toUpperCase();
    // Skip header rows and empty rows
    if (first.includes('NOMBRE') || first.includes('CURP')) return false;
    if (!r[1] || r[1].length < 10) return false; // CURP must be at least 10 chars
    if (first === '' && second === '') return false;
    return true;
  });

  for (const row of dataRows) {
    try {
      // FERNANDA CSV columns:
      // 0:NOMBRE, 1:CURP, 2:NSS, 3:BANCO, 4:CLABE, 5:PENSION, 6:AUMENTO, 7:NUMERO, 8:CONTACTADO
      // 9:COMENTARIOS, 10:LINK DRIVE, 11:CORREO, 12:RETROACTIVO FICTICIO, 13:RETROACTIVO FINAL
      // 14:LINK CONSTANCIA, 15:CORREO SIPRE, 16:PAGADO
      const nombre = (row[0] || '').trim();
      const curp = cleanCURP(row[1]);
      const nss = cleanNSS(row[2]);
      const banco = (row[3] || '').trim() || null;
      const clabe = (row[4] || '').replace(/\s/g, '') || null;
      const pension = cleanMoney(row[5]);
      const aumento = cleanMoney(row[6]);
      const telefono = cleanPhone(row[7]);
      const contactado = parseBool(row[8]);
      const comentarios = (row[9] || '').trim() || null;
      const linkDrive = (row[10] || '').trim() || null;
      const correo = (row[11] || '').trim() || null;
      const retroFicticio = cleanMoney(row[12]);
      const retroFinal = cleanMoney(row[13]);
      const linkConstancia = (row[14] || '').trim() || null;
      const correoSipre = (row[15] || '').trim() || null;
      const pagado = parseBool(row[16]);

      if (!curp || curp.length < 10 || !nombre) { skipped++; continue; }

      // Determine estatus from comentarios + contactado
      let estatus = 'NUEVO';
      if (comentarios) {
        const com = comentarios.toUpperCase();
        if (com.includes('COMPLETO')) estatus = 'FORMALIZADO';
        else if (com.includes('DOMICILIADO')) estatus = 'FORMALIZADO';
        else if (com.includes('DOCUMENTOS')) estatus = 'EN_PROCESO';
        else if (pension) estatus = 'VIABLE';
        else if (contactado) estatus = 'VALIDANDO';
      } else if (pension) {
        estatus = 'VIABLE';
      }

      // Insert prospecto
      const prospRes = await client.query(`
        INSERT INTO prospectos 
          (nombre_completo, curp, nss, telefono_contacto, origen_canal, estatus, 
           curp_valida, nss_valido, correo_electronico, correo_sipre, contactado,
           origen_lote, fecha_ingreso, fecha_ultima_actualizacion)
        VALUES ($1,$2,$3,$4,'Lote Fernanda',$5,true,true,$6,$7,$8,'FERNANDA_PALACIOS',NOW(),NOW())
        ON CONFLICT (curp) DO UPDATE SET
          nss = EXCLUDED.nss,
          telefono_contacto = EXCLUDED.telefono_contacto,
          estatus = EXCLUDED.estatus,
          correo_electronico = EXCLUDED.correo_electronico,
          correo_sipre = EXCLUDED.correo_sipre,
          contactado = EXCLUDED.contactado,
          fecha_ultima_actualizacion = NOW()
        RETURNING id
      `, [nombre, curp, nss, telefono, estatus, correo, correoSipre, contactado]);

      const prospectoId = prospRes.rows[0].id;

      // Determine carpeta Drive name
      const carpetaNombre = linkDrive ? nombre.toUpperCase() + ' ' + curp + (nss ? ' ' + nss : '') : null;

      // Determine estatus expediente
      let estatusExp = 'EN_RECOLECCION';
      if (comentarios) {
        const com = comentarios.toUpperCase();
        if (com.includes('COMPLETO')) estatusExp = 'COMPLETO';
        else if (com.includes('DOMICILIADO')) estatusExp = 'APROBADO';
      }

      // Insert or update expediente
      await client.query(`
        INSERT INTO expedientes
          (prospecto_id, monto_pension_actual, institucion_bancaria, cuenta_clabe,
           nombre_carpeta_drive, url_carpeta_drive, estatus_expediente,
           aprobacion_superior, aumento_pension, retroactivo_ficticio, retroactivo_final,
           pagado, link_constancia, comentarios,
           ine_ambos_lados, comprobante_domicilio, resolucion_pension, estados_cuenta, foto_con_ine,
           fecha_creacion, fecha_ultima_actualizacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,$11,$12,$13,'PENDIENTE','PENDIENTE','PENDIENTE','PENDIENTE','PENDIENTE',NOW(),NOW())
        ON CONFLICT (prospecto_id) DO UPDATE SET
          monto_pension_actual = EXCLUDED.monto_pension_actual,
          institucion_bancaria = EXCLUDED.institucion_bancaria,
          cuenta_clabe = EXCLUDED.cuenta_clabe,
          nombre_carpeta_drive = EXCLUDED.nombre_carpeta_drive,
          url_carpeta_drive = EXCLUDED.url_carpeta_drive,
          aumento_pension = EXCLUDED.aumento_pension,
          retroactivo_ficticio = EXCLUDED.retroactivo_ficticio,
          retroactivo_final = EXCLUDED.retroactivo_final,
          pagado = EXCLUDED.pagado,
          link_constancia = EXCLUDED.link_constancia,
          comentarios = EXCLUDED.comentarios,
          fecha_ultima_actualizacion = NOW()
      `, [prospectoId, pension, banco, clabe, carpetaNombre, linkDrive, estatusExp,
          aumento, retroFicticio, retroFinal, pagado, linkConstancia, comentarios]);

      inserted++;
    } catch (e) {
      console.error(`  ❌ Error en fila [${row[0]}]: ${e.message}`);
      errors++;
    }
  }

  console.log(`  ✅ Fernanda Palacios: ${inserted} insertados, ${skipped} omitidos, ${errors} errores`);
}

// ─────────────────────────────────────────────
// IMPORT LOTE C + BASE CAPTURA → lotes_historicos
// ─────────────────────────────────────────────
async function importLoteHistorico(filePath, origenArchivo, colMap) {
  console.log(`\n📥 Importando ${origenArchivo}...`);
  const rows = parseCSV(filePath);
  let inserted = 0, skipped = 0;

  for (const row of rows) {
    try {
      const first = (row[0] || '').trim();
      // Skip headers, empty rows, notes
      if (!first || first.toUpperCase().includes('NOMBRE') || first.toUpperCase().includes('LOTE') ||
          first.length > 60 || first.toUpperCase().includes('CELDA') || 
          first.toUpperCase().includes('NOS UBICAMOS') || first.toUpperCase().includes('EN EL TRANSCURSO') ||
          first.toUpperCase().includes('BUENAS') || first.toUpperCase().includes('CLARO') ||
          first.toUpperCase().includes('DISCULPE')) {
        skipped++; continue;
      }
      
      const curp = cleanCURP(row[colMap.curp]);
      if (!curp || curp.length < 10) { skipped++; continue; }

      const nombre = first;
      const nss = colMap.nss !== undefined ? cleanNSS(row[colMap.nss]) : null;
      const banco = colMap.banco !== undefined ? (row[colMap.banco] || '').trim() || null : null;
      const clabe = colMap.clabe !== undefined ? (row[colMap.clabe] || '').replace(/\s/g,'') || null : null;
      const pension = colMap.pension !== undefined ? cleanMoney(row[colMap.pension]) : null;
      const telefono = cleanPhone(row[colMap.telefono]);
      const estatus = colMap.estatus !== undefined ? mapEstatus(row[colMap.estatus]) : 'NUEVO';
      const sipre = colMap.sipre !== undefined ? (row[colMap.sipre] || '').trim() || null : null;
      const capacidadReal = colMap.capacidad !== undefined ? cleanMoney(row[colMap.capacidad]) : null;

      await client.query(`
        INSERT INTO lotes_historicos
          (nombre_completo, curp, nss, banco, clabe_interbancaria, monto_pension,
           numero_telefono, estatus_original, sipre, capacidad_real, origen_archivo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT DO NOTHING
      `, [nombre, curp, nss, banco, clabe, pension, telefono, estatus, sipre, capacidadReal, origenArchivo]);
      
      inserted++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`  ✅ ${origenArchivo}: ${inserted} insertados, ${skipped} omitidos`);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL crm_db');

    // 1. Fernanda Palacios → prospectos + expedientes
    await importFernanda();

    // 2. LOTE C → lotes_historicos
    // cols: 0:NOMBRE, 1:CURP, 2:NSS, 3:BANCO, 4:CLABE, 5:PENSION, 6:TELEFONO, 7:ESTATUS, 8:SIPRE, 9:CAPACIDAD
    await importLoteHistorico(
      path.join(__dirname, 'LOTE C 120526 - Hoja 1.csv'),
      'LOTE_C_120526',
      { curp:1, nss:2, banco:3, clabe:4, pension:5, telefono:6, estatus:7, sipre:8, capacidad:9 }
    );

    // 3. BASE CAPTURA → lotes_historicos
    // cols: 0:NOMBRE, 1:CURP, 2:NSS, 3:TELEFONO
    await importLoteHistorico(
      path.join(__dirname, 'BASE DE CAPTURA - Hoja 1.csv'),
      'BASE_CAPTURA',
      { curp:1, nss:2, telefono:3 }
    );

    // Summary
    const res1 = await client.query('SELECT COUNT(*) FROM prospectos');
    const res2 = await client.query('SELECT COUNT(*) FROM lotes_historicos');
    console.log(`\n🎉 IMPORTACIÓN COMPLETADA`);
    console.log(`   Prospectos en BD: ${res1.rows[0].count}`);
    console.log(`   Registros históricos (Lotes): ${res2.rows[0].count}`);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

main();
