const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'FERNANDA PALACIOS RIOS.xlsx'));

  const ws = wb.worksheets[0];
  console.log('Hoja:', ws.name);
  console.log('Filas:', ws.rowCount, '| Columnas:', ws.columnCount);

  // Print header row
  const header = ws.getRow(1);
  const headers = [];
  header.eachCell((cell, col) => {
    headers[col] = cell.value;
  });
  console.log('\nCOLUMNAS:', headers.join(' | '));

  // Print first 5 data rows
  for (let i = 2; i <= Math.min(6, ws.rowCount); i++) {
    const row = ws.getRow(i);
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      let val = cell.value;
      if (val && typeof val === 'object' && val.text) val = val.text;
      if (val && typeof val === 'object' && val.hyperlink) val = val.hyperlink;
      values[col] = val;
    });
    console.log(`\nFila ${i}:`, values.join(' | '));
  }
}

main().catch(console.error);
