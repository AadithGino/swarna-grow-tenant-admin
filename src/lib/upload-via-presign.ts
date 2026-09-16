import { env } from "@/src/config/env";

type PresignResult = {
  uploadId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

export async function uploadFileViaPresign(
  file: File,
  presign: (input: {
    purpose: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }) => Promise<PresignResult>,
  purpose: string,
): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const result = await presign({
    purpose,
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  });
  if (result.uploadUrl && !env.useMocks) {
    const put = await fetch(result.uploadUrl, {
      method: result.method || "PUT",
      headers: {
        ...(result.headers ?? {}),
        "Content-Type": contentType,
      },
      body: file,
    });
    if (!put.ok) throw new Error("Upload to storage failed");
  }
  return result.uploadId;
}
