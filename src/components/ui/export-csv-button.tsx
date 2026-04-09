"use client";

import { Button } from "@/components/ui/button";

interface ExportCSVButtonProps {
  data: Record<string, any>[];
  headers: { key: string; label: string }[];
  fileName?: string;
}

export function ExportCSVButton({ data, headers, fileName = "export.csv" }: ExportCSVButtonProps) {
  const downloadCsv = () => {
    const rows = [headers.map((header) => header.label).join(",")];
    data.forEach((item) => {
      rows.push(
        headers
          .map((header) => {
            const value = item[header.key];
            const text = value === null || value === undefined ? "" : String(value);
            return JSON.stringify(text);
          })
          .join(",")
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={downloadCsv}>
      Export CSV
    </Button>
  );
}
