"use client";

import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";

/** True when the customer has at least one GOLD_WEIGHT (gold accumulation) scheme. */
export function useCustomerGoldMetricsVisible() {
  const { data, isLoading, isFetching } = useGetCustomerHomeQuery();
  return {
    visible: data?.hasGoldAccumulationScheme === true,
    isLoading: isLoading || isFetching,
    home: data,
  };
}

export function isGoldWeightScheme(valueBasis?: string | null) {
  return valueBasis === "GOLD_WEIGHT";
}
