"use client";

import { useEffect } from "react";
import { hydrateSession } from "@/src/store/slices/session-slice";
import { useAppDispatch } from "@/src/store/hooks";

export function SessionHydrator() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(hydrateSession());
  }, [dispatch]);
  return null;
}
