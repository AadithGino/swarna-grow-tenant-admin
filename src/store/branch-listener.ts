import { createListenerMiddleware } from "@reduxjs/toolkit";
import { adminApi } from "@/src/store/api/admin-api";
import { setBranch } from "@/src/store/slices/ui-slice";

export const branchListener = createListenerMiddleware();

branchListener.startListening({
  actionCreator: setBranch,
  effect: async (_action, api) => {
    api.dispatch(
      adminApi.util.invalidateTags([
        "Dashboard",
        "Alert",
        "Customer",
        "Enrollment",
        "Payment",
        "Cash",
        "GoldRate",
        "Message",
        "Plan",
        "Access",
        "Grievance",
        "Settings",
        "Export",
      ]),
    );
  },
});
