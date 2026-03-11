const xlsx = require('xlsx');

const workbook = xlsx.readFile('../../Global-Oil-and-Gas-Extraction-Tracker-March-2026.xlsx');
const sheetName = workbook.SheetNames[0]; // Wait, let's see all sheet names first
console.log('Sheets:', workbook.SheetNames);

const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Or a specific sheet if it's named 'Data'
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
  console.log('Headers sheet 0:', data[0]);
  if (data.length > 1) console.log('Row 1:', data[1]);
}

if (workbook.SheetNames.length > 1) {
  const ws1 = workbook.Sheets[workbook.SheetNames[1]];
  const d1 = xlsx.utils.sheet_to_json(ws1, { header: 1 });
  if (d1.length > 0) console.log('Headers sheet 1:', d1[0]);
}

