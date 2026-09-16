export function downloadText(
  filename: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printBlobUrl(blobUrl: string) {
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.addEventListener("load", () => {
    win.focus();
    win.print();
  });
  return true;
}

export function downloadBlobUrl(filename: string, blobUrl: string) {
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_500);
}

export function downloadJson(filename: string, data: unknown) {
  downloadText(
    filename,
    JSON.stringify(data, null, 2),
    "application/json;charset=utf-8",
  );
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  downloadText(
    filename,
    [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n"),
    "text/csv;charset=utf-8",
  );
}
