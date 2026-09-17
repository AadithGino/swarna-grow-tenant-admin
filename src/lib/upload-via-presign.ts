import { env } from "@/src/config/env";

type PresignResult = {
  uploadId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

type UploadCompleteResult = {
  uploadId: string;
  status: string;
  viewUrl?: string;
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
  complete?: (uploadId: string) => Promise<UploadCompleteResult>,
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
  if (complete) {
    await complete(result.uploadId);
  }
  return result.uploadId;
}
