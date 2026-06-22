const fs = require('fs');
let c = fs.readFileSync('src/services/dbSeed.ts', 'utf8');

c = c.replace(/Muã±iz/g, 'Muñiz')
     .replace(/Nuã‘ez/g, 'Nuñez')
     .replace(/DOCUMENTACIÁ“N/g, 'DOCUMENTACIÓN')
     .replace(/ã±/g, 'ñ')
     .replace(/ã‘/g, 'Ñ')
     .replace(/Á“/g, 'Ó')
     .replace(/Ã¡/g, 'á')
     .replace(/Ã©/g, 'é')
     .replace(/Ã\u00AD/g, 'í')
     .replace(/Ã³/g, 'ó')
     .replace(/Ãº/g, 'ú')
     .replace(/Ã‘/g, 'Ñ')
     .replace(/Ã±/g, 'ñ');

fs.writeFileSync('src/services/dbSeed.ts', c);
console.log('Fixed dbSeed.ts encoding');
