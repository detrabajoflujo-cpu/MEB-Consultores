const fs = require('fs');
const { Client } = require('pg');

const client = new Client({ host:'localhost', port:5432, database:'crm_db', user:'crm_user', password:'crm_pass' });

client.connect().then(async () => {
  const r = await client.query(`
    SELECT p.id, p.nombre_completo, p.curp, p.nss, p.telefono_contacto,
           p.origen_canal, p.estatus, p.curp_valida, p.nss_valido,
           p.correo_electronico, p.correo_sipre, p.contactado,
           p.fecha_ingreso, p.fecha_ultima_actualizacion, p.origen_lote,
           e.monto_pension_actual, e.aumento_pension, e.institucion_bancaria,
           e.cuenta_clabe, e.nombre_carpeta_drive, e.url_carpeta_drive,
           e.estatus_expediente, e.aprobacion_superior, e.aprobado_por,
           e.ine_ambos_lados, e.comprobante_domicilio, e.resolucion_pension,
           e.estados_cuenta, e.foto_con_ine, e.retroactivo_ficticio,
           e.retroactivo_final, e.pagado, e.link_constancia, e.comentarios
    FROM prospectos p
    LEFT JOIN expedientes e ON e.prospecto_id = p.id
    WHERE p.origen_lote = 'FERNANDA_PALACIOS' OR p.origen_canal = 'Lote Fernanda'
    ORDER BY p.id
  `);

  // Clean accents/encoding issues and build TS array
  const fix = (s) => {
    if (!s) return null;
    return s
      .replace(/Ã¡/g,'á').replace(/Ã©/g,'é').replace(/Ã­/g,'í').replace(/Ã³/g,'ó').replace(/Ãº/g,'ú')
      .replace(/Ã±/g,'ñ').replace(/Ã/g,'Á').replace(/Ã‰/g,'É').replace(/Ã/g,'Í').replace(/Ã"/g,'Ó')
      .replace(/Ãš/g,'Ú').replace(/Ã'/g,'Ñ').replace(/MuÃ±iz/g,'Muñiz').replace(/TrasviÃ±a/g,'Trasviña')
      .replace(/MucIÃO/g,'Muciño').replace(/MUCIÃO/g,'MUCIÑO').replace(/NUÃEZ/g,'NÚÑEZ')
      .replace(/GonzÃ¡lez/g,'González').replace(/LÃ³pez/g,'López').replace(/MartÃ­nez/g,'Martínez')
      .replace(/RamÃ­rez/g,'Ramírez').replace(/HernÃ¡ndez/g,'Hernández').replace(/JimÃ©nez/g,'Jiménez')
      .replace(/JosÃ©/g,'José').replace(/GarcÃ­a/g,'García').replace(/SÃ¡nchez/g,'Sánchez')
      .replace(/IbÃ¡ÃNez/g,'Ibáñez').replace(/documentaciÃN/g,'documentación')
      .replace(/DOCUMENTACIÃN/g,'DOCUMENTACIÓN').replace(/DOCUMNTACIÃN/g,'DOCUMENTACIÓN');
  };

  const rows = r.rows.map((row, i) => ({
    id: parseInt(row.id),
    nombreCompleto: fix(row.nombre_completo) || '',
    curp: (row.curp || '').trim(),
    nss: (row.nss || '').trim(),
    telefonoContacto: (row.telefono_contacto || '').trim(),
    origenCanal: (row.origen_canal || 'Lote Fernanda'),
    estatus: row.estatus || 'NUEVO',
    curpValida: row.curp_valida === true || row.curp_valida === 't',
    nssValido: row.nss_valido === true || row.nss_valido === 't',
    correoElectronico: fix(row.correo_electronico),
    correoSipre: fix(row.correo_sipre),
    contactado: row.contactado === true || row.contactado === 't',
    fechaIngreso: row.fecha_ingreso,
    fechaUltimaActualizacion: row.fecha_ultima_actualizacion,
    observaciones: fix(row.comentarios),
    // Expediente
    montoPensionActual: row.monto_pension_actual ? parseFloat(row.monto_pension_actual) : null,
    aumentoPension: row.aumento_pension ? parseFloat(row.aumento_pension) : null,
    institucionBancaria: fix(row.institucion_bancaria),
    cuentaClabe: (row.cuenta_clabe || '').trim() || null,
    nombreCarpetaDrive: fix(row.nombre_carpeta_drive),
    urlCarpetaDrive: (row.url_carpeta_drive && row.url_carpeta_drive.startsWith('http')) ? row.url_carpeta_drive : null,
    estatusExpediente: row.estatus_expediente || 'EN_RECOLECCION',
    aprobacionSuperior: row.aprobacion_superior === true || row.aprobacion_superior === 't',
    aprobadoPor: row.aprobado_por || null,
    ineAmbosLados: row.ine_ambos_lados || 'PENDIENTE',
    comprobanteDomicilio: row.comprobante_domicilio || 'PENDIENTE',
    resolucionPension: row.resolucion_pension || 'PENDIENTE',
    estadosCuenta: row.estados_cuenta || 'PENDIENTE',
    fotoConIne: row.foto_con_ine || 'PENDIENTE',
    retroactivoFicticio: row.retroactivo_ficticio ? parseFloat(row.retroactivo_ficticio) : null,
    retroactivoFinal: row.retroactivo_final ? parseFloat(row.retroactivo_final) : null,
    pagado: row.pagado === true || row.pagado === 't',
    linkConstancia: (row.link_constancia && row.link_constancia.startsWith('http')) ? row.link_constancia : null,
    comentarios: fix(row.comentarios),
  }));

  const ts = `// AUTO-GENERADO — no editar a mano. Generado por: node generate_seed.js
// Fuente: PostgreSQL crm_db.prospectos + expedientes
// Total: ${rows.length} prospectos de FERNANDA PALACIOS RIOS
// Fecha: ${new Date().toISOString()}

export const DB_PROSPECTOS = ${JSON.stringify(rows, null, 2)} as const;
`;

  fs.writeFileSync(
    'c:\\Users\\Angel-PC\\Downloads\\ProyectoCitas\\frontend-react\\src\\services\\dbSeed.ts',
    ts
  );
  console.log(`OK — generado dbSeed.ts con ${rows.length} registros`);
  await client.end();
});
