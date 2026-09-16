"use client";

import { useEffect, useState } from "react";

export type PlatformSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
};

export function usePlatformSession() {
  const [user, setUser] = useState<PlatformSessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("swarnagrow.platformUser");
      if (raw) setUser(JSON.parse(raw) as PlatformSessionUser);
    } catch {
      setUser(null);
    }
  }, []);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "SA";

  return { user, initials };
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function platformGreeting(name?: string | null) {
  const first = name?.trim().split(/\s+/)[0] ?? "there";
  return `${greetingForHour(new Date().getHours())}, ${first}`;
}
