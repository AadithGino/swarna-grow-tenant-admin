"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { uploadIdFromCatalogRef } from "@/src/lib/ecommerce-upload-id";
import {
  useGetEcommerceUploadDownloadQuery,
  useLazyGetEcommerceUploadDownloadQuery,
} from "@/src/store/api/admin-api";
import {
  useGetCustomerUploadDownloadQuery,
  useLazyGetCustomerUploadDownloadQuery,
} from "@/src/store/api/customer-api";

const REFRESH_MS = 480_000;

export function EcommerceCatalogImage({
  uploadId,
  viewUrl,
  channel,
  alt = "",
  className,
  fill = false,
}: {
  uploadId?: string | null;
  viewUrl?: string | null;
  channel: "admin" | "customer";
  alt?: string;
  className?: string;
  fill?: boolean;
}) {
  const directHttps = viewUrl?.startsWith("https://") ? viewUrl : null;
  const resolvedId = uploadId ?? uploadIdFromCatalogRef(viewUrl);
  const adminQuery = useGetEcommerceUploadDownloadQuery(resolvedId as string, {
    skip: !resolvedId || channel !== "admin" || Boolean(directHttps),
    pollingInterval: REFRESH_MS,
  });
  const customerQuery = useGetCustomerUploadDownloadQuery(resolvedId as string, {
    skip: !resolvedId || channel !== "customer",
    pollingInterval: REFRESH_MS,
  });
  const [lazyAdmin] = useLazyGetEcommerceUploadDownloadQuery();
  const [lazyCustomer] = useLazyGetCustomerUploadDownloadQuery();
  const [imgError, setImgError] = useState(false);

  const active = channel === "admin" ? adminQuery : customerQuery;
  const lazyRefetch = channel === "admin" ? lazyAdmin : lazyCustomer;

  const refetch = useCallback(() => {
    if (!resolvedId) return;
    void lazyRefetch(resolvedId);
    setImgError(false);
  }, [lazyRefetch, resolvedId]);

  if (!resolvedId) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-xs text-muted-foreground",
          className,
        )}
      >
        No image
      </div>
    );
  }

  const src = active.data?.downloadUrl;
  if (active.isLoading || !src || imgError) {
    return (
      <div
        className={cn(
          "animate-pulse bg-muted",
          className,
          active.isError && !active.isLoading ? "cursor-pointer" : "",
        )}
        onClick={active.isError ? refetch : undefined}
        role={active.isError ? "button" : undefined}
        title={active.isError ? "Tap to retry image load" : undefined}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 400px"
        className={cn("object-cover", className)}
        onError={() => {
          setImgError(true);
          refetch();
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => {
        setImgError(true);
        refetch();
      }}
    />
  );
}
