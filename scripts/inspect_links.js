const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'FERNANDA PALACIOS RIOS.xlsx'));
  const ws = wb.worksheets[0];

  console.log('Inspeccionando filas con posibles links...\n');

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1 || rowNum > 55) return;

    const nombre = row.getCell(2).value;
    if (!nombre) return;

    // Check every cell in the row for hyperlinks or http content
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const val = cell.value;
      let found = null;

      if (typeof val === 'string' && val.includes('http')) found = val;
      if (val && typeof val === 'object') {
        if (val.hyperlink && val.hyperlink.includes('http')) found = val.hyperlink;
        if (val.text && val.text.includes('http')) found = val.text;
      }

      // Also check cell's hyperlink property directly
      if (cell.hyperlink && cell.hyperlink.includes('http')) {
        found = cell.hyperlink;
      }

      if (found) {
        console.log(`Fila ${rowNum}, Col ${colNum} [${nombre}]: ${found}`);
      }
    });
  });
}

main().catch(console.error);
