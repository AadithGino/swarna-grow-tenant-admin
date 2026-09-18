"use client";

import { useEffect } from "react";
import { hydrateCustomerSession } from "@/src/store/slices/customer-session-slice";
import { hydrateSession } from "@/src/store/slices/session-slice";
import { useAppDispatch } from "@/src/store/hooks";

export function SessionHydrator() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(hydrateSession());
    dispatch(hydrateCustomerSession());
  }, [dispatch]);
  return null;
}
