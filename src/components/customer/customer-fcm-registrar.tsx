"use client";

import { useEffect } from "react";
import { useRegisterCustomerFcmTokenMutation } from "@/src/store/api/customer-api";

const DEVICE_ID_KEY = "swarnagrow.customer.deviceId";

function resolveDeviceId() {
  if (typeof window === "undefined") return "web-device";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `web_${crypto.randomUUID()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

/** Syncs host-provided FCM token to backend when available. */
export function CustomerFcmRegistrar() {
  const [registerToken] = useRegisterCustomerFcmTokenMutation();

  useEffect(() => {
    const token =
      (window as unknown as { __SWARNAGROW_FCM_TOKEN__?: string }).__SWARNAGROW_FCM_TOKEN__
      ?? window.sessionStorage.getItem("swarnagrow.fcmToken");
    if (!token || token.length < 20) return;
    const platform = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "android";
    void registerToken({
      fcmToken: token,
      deviceId: resolveDeviceId(),
      platform,
    });
  }, [registerToken]);

  return null;
}
