const ExcelJS = require('exceljs');
const { Client } = require('pg');
const path = require('path');

// From the inspection output we know:
// Col 3 in the file is ACTUALLY the NSS (0175562331/9 etc)
// Col 2 is NOMBRE
// Col 4 is CURP? Let's re-inspect all column values for row 2
// Actually the first column is blank (col1=empty), so:
// col1=blank, col2=NOMBRE, col3=CURP, col4=NSS...
// BUT the inspect showed col3 = "0175562331/9" (NSS format)
// So maybe col2=CURP, col3=NSS? Let's dump raw cell types

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'FERNANDA PALACIOS RIOS.xlsx'));
  const ws = wb.worksheets[0];

  // Print header row carefully
  const header = ws.getRow(1);
  console.log('=== HEADER ROW ===');
  for (let c = 1; c <= 18; c++) {
    const cell = header.getCell(c);
    console.log(`  Col ${c}: "${cell.value}"`);
  }

  // Print first data row
  const row2 = ws.getRow(2);
  console.log('\n=== ROW 2 (first data) ===');
  for (let c = 1; c <= 18; c++) {
    const cell = row2.getCell(c);
    let val = cell.value;
    let hyper = cell.hyperlink || '';
    if (val && typeof val === 'object' && val.hyperlink) hyper = val.hyperlink;
    console.log(`  Col ${c}: val="${JSON.stringify(val)}" hyper="${hyper}"`);
  }
}

main().catch(console.error);
