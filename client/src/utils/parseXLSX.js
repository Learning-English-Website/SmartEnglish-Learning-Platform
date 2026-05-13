import * as XLSX from 'xlsx';

/**
 * Parse XLSX file into headers and rows
 * @param {File} file - The XLSX file to parse
 * @returns {Promise<{ headers: string[], rows: string[][] }>}
 */
export async function parseXLSX(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rawData[0].map((h) => String(h ?? '').trim());
  const rows = rawData.slice(1).map((row) =>
    headers.map((_, i) => String(row[i] ?? '').trim())
  );

  return { headers, rows };
}

/**
 * Validate parsed XLSX data
 * @param {{ headers: string[], rows: string[][] }} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateXLSX(data) {
  if (data.headers.length === 0) {
    return { valid: false, error: 'No headers found in XLSX file' };
  }

  if (data.rows.length === 0) {
    return { valid: false, error: 'No data rows found in XLSX file' };
  }

  return { valid: true };
}
