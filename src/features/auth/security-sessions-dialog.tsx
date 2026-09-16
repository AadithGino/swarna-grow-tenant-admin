"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  useChangePasswordMutation,
  useGetDevicesQuery,
  useLogoutAllMutation,
  useRevokeDeviceMutation,
} from "@/src/store/api/admin-api";
import { useAppDispatch } from "@/src/store/hooks";
import { clearSession } from "@/src/store/slices/session-slice";

export function SecuritySessionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const devicesQuery = useGetDevicesQuery(undefined, { skip: !open });
  const [revokeDevice, revokeState] = useRevokeDeviceMutation();
  const [changePassword, changeState] = useChangePasswordMutation();
  const [logoutAll, logoutAllState] = useLogoutAllMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const devices = devicesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Security & sessions</DialogTitle>
            <DialogDescription>
              Manage signed-in devices and change your password.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            <section>
              <h3 className="text-sm font-bold text-[#1a1014]">Devices</h3>
              {devicesQuery.isLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
              ) : devicesQuery.isError ? (
                <p className="mt-2 text-sm text-red-700">
                  Could not load devices.
                </p>
              ) : devices.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No active devices.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {devices.map((device) => (
                    <li
                      key={device.deviceId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#eaded9] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {device.platform || "Device"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Last used {device.lastUsedAt || "—"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-red-700"
                        disabled={revokeState.isLoading}
                        onClick={async () => {
                          try {
                            await revokeDevice(device.deviceId).unwrap();
                            toast.success("Device revoked");
                            devicesQuery.refetch();
                          } catch {
                            toast.error("Could not revoke device");
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 border-t border-[#eaded9] pt-4">
              <h3 className="text-sm font-bold text-[#1a1014]">
                Change password
              </h3>
              <div>
                <FieldLabel>Current password</FieldLabel>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <FieldLabel>New password</FieldLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                disabled={
                  changeState.isLoading ||
                  !currentPassword.trim() ||
                  !newPassword.trim()
                }
                onClick={async () => {
                  try {
                    await changePassword({
                      currentPassword,
                      newPassword,
                    }).unwrap();
                    toast.success("Password changed — other sessions ended");
                    setCurrentPassword("");
                    setNewPassword("");
                    dispatch(clearSession());
                    onOpenChange(false);
                    router.push("/login");
                  } catch (err) {
                    const message =
                      (err as { data?: { error?: { message?: string } } })?.data
                        ?.error?.message ?? "Could not change password";
                    toast.error(message);
                  }
                }}
              >
                {changeState.isLoading ? "Saving…" : "Update password"}
              </Button>
            </section>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            className="text-red-700"
            disabled={logoutAllState.isLoading}
            onClick={async () => {
              try {
                await logoutAll().unwrap();
              } catch {
                // Still clear local session.
              }
              dispatch(clearSession());
              onOpenChange(false);
              router.push("/login");
              toast.success("Signed out of all sessions");
            }}
          >
            Log out all devices
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
