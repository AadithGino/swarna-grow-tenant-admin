/** Profile `address` may be a string or structured object from the API. */
export type CustomerAddressValue =
  | string
  | {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
    }
  | null
  | undefined;

export function formatCustomerAddressDisplay(address: CustomerAddressValue): string {
  if (address == null) return "";
  if (typeof address === "string") return address.trim();
  if (typeof address === "object") {
    return [address.line1, address.line2, address.city, address.state, address.pincode]
      .map((part) => (part == null ? "" : String(part).trim()))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}
