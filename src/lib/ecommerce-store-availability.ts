export type EcommerceAccessSlice = {
  planEntitled?: boolean;
  enabled?: boolean;
  active?: boolean;
};

export function resolveShopAvailability(input: {
  planEntitled: boolean;
  ecommerceEnabled: boolean;
}): { available: boolean; ecommerce: EcommerceAccessSlice } {
  const planEntitled = input.planEntitled === true;
  const enabled = input.ecommerceEnabled === true;
  return {
    available: planEntitled && enabled,
    ecommerce: {
      planEntitled,
      enabled,
      active: planEntitled && enabled,
    },
  };
}
