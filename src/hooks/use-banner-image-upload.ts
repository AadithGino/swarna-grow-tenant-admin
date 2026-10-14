"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_BYTES = 2_000_000;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateBannerImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use PNG, JPEG, or WebP.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }
  return null;
}

export function useBannerImageUpload({
  upload,
}: {
  upload: (file: File) => Promise<string>;
}) {
  const [imageUploadId, setImageUploadId] = useState<string | null>(null);
  const [baselineUploadId, setBaselineUploadId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const imageUploadIdRef = useRef<string | null>(imageUploadId);
  useEffect(() => {
    imageUploadIdRef.current = imageUploadId;
  }, [imageUploadId]);

  const reset = useCallback((uploadId: string | null) => {
    generationRef.current += 1;
    setImageUploadId(uploadId);
    setBaselineUploadId(uploadId);
    setUploading(false);
    setUploadError(null);
  }, []);

  useEffect(
    () => () => {
      generationRef.current += 1;
    },
    [],
  );

  const pickFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setUploadError(null);
      const validationError = validateBannerImageFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }
      const generation = ++generationRef.current;
      const previous = imageUploadIdRef.current;
      setUploading(true);
      try {
        const id = await upload(file);
        if (generation !== generationRef.current) return;
        setImageUploadId(id);
      } catch {
        if (generation !== generationRef.current) return;
        setImageUploadId(previous);
        setUploadError("Upload failed. Previous image kept.");
      } finally {
        if (generation === generationRef.current) setUploading(false);
      }
    },
    [upload],
  );

  return {
    imageUploadId,
    baselineUploadId,
    uploading,
    uploadError,
    reset,
    pickFile,
    setImageUploadId,
  };
}
