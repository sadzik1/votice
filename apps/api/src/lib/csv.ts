// prefix formula-like cells so spreadsheets don't execute them (CSV injection)
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

// BOM so Excel detects UTF-8
export function toCsv(rows: readonly (readonly string[])[]): string {
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  return `﻿${body}\r\n`;
}
