"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "@/src/config/env";
import { readStoredAccessToken } from "@/src/lib/auth-token-storage";

export const CustomerRealtimeEvent = {
  REDEMPTION_HANDOVER_OTP_RELEASED: "redemption.handover_otp_released",
  SHOP_PICKUP_CODE_RELEASED: "shop.pickup_code_released",
} as const;

export type CustomerRealtimeEventName =
  (typeof CustomerRealtimeEvent)[keyof typeof CustomerRealtimeEvent];

export type HandoverCodeSocketPayload = {
  kind: "REDEMPTION_OTP" | "SHOP_PICKUP";
  deepLink?: string;
  expiresAt?: string | null;
  redemptionId?: string;
  schemeId?: string | null;
  orderId?: string;
  orderNumber?: string | null;
};

function realtimeOrigin() {
  try {
    const u = new URL(env.apiBaseUrl);
    return u.origin;
  } catch {
    return "http://localhost:4000";
  }
}

let socket: Socket | null = null;

export function getCustomerRealtimeSocket() {
  return socket;
}

export function connectCustomerRealtime() {
  if (typeof window === "undefined" || env.useMocks) return null;
  const token = readStoredAccessToken("customer");
  if (!token) {
    disconnectCustomerRealtime();
    return null;
  }
  if (socket?.connected) {
    socket.auth = { token };
    return socket;
  }
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io(realtimeOrigin(), {
    path: "/realtime",
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1500,
  });
  return socket;
}

export function disconnectCustomerRealtime() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
