/**
 * Parse CSV content into headers and rows
 * @param {string} content - Raw CSV content
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseCSV(content) {
  console.log('=== parseCSV called ===');
  console.log('Input content (first 300 chars):', content.substring(0, 300));
  console.log('Content char codes (first 10):', [...content.substring(0, 10)].map(c => c.charCodeAt(0)));

  // Remove BOM if present
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.substring(1) : content;

  const lines = cleanContent.split(/\r?\n/).filter((line) => line.trim());

  console.log('Lines after split:', lines.length);
  console.log('First line:', lines[0]);
  console.log('First line char codes:', [...(lines[0] || '')].slice(0, 10).map(c => c.charCodeAt(0)));

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Parsed headers:', headers);

  const rows = lines.slice(1).map((line) => {
    const parsed = parseCSVLine(line);
    console.log('Parsed row:', parsed);
    return parsed;
  });

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - A single line from CSV
 * @returns {string[]}
 */
function parseCSVLine(line) {
  console.log('=== parseCSVLine called ===');
  console.log('Input line:', line);
  console.log('Line length:', line.length);

  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++; // skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  console.log('Parsed result:', result);
  return result;
}

/**
 * Validate parsed CSV data
 * @param {{ headers: string[], rows: string[][] }} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCSV(data) {
  if (data.headers.length === 0) {
    return { valid: false, error: 'No headers found in CSV file' };
  }

  if (data.rows.length === 0) {
    return { valid: false, error: 'No data rows found in CSV file' };
  }

  // Check all rows have same number of columns
  const columnCount = data.headers.length;
  const invalidRows = data.rows.filter((row) => row.length !== columnCount);

  if (invalidRows.length > 0) {
    return {
      valid: false,
      error: `${invalidRows.length} row(s) have inconsistent column count`,
    };
  }

  return { valid: true };
}
