// CSV con punto y coma y BOM para que Excel en español lo abra con acentos y columnas correctas.
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
}

export function csvResponse(filename: string, rows: (string | number | null | undefined)[][]) {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
