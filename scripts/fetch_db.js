const { Client } = require('pg');
const fs = require('fs');
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
    ORDER BY p.id
  `);
  fs.writeFileSync('db_prospectos.json', JSON.stringify(r.rows, null, 2));
  console.log('OK: ' + r.rows.length + ' registros');
  await client.end();
});
