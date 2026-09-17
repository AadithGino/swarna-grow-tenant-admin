"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgentLogoutMutation, useChangeAgentPasswordMutation, useGetAgentProfileQuery } from "@/src/store/api/agent-api";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { clearAgentSession } from "@/src/store/slices/agent-session-slice";
import { AgentCard, AgentLoadingCards, AgentPageHeader } from "@/src/components/agent/agent-ui";

export function AgentAccountPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.agentSession.session);
  const profile = useGetAgentProfileQuery();
  const [changePassword, changeState] = useChangeAgentPasswordMutation();
  const [logout] = useAgentLogoutMutation();
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  if (profile.isLoading) return <AgentLoadingCards />;
  const user = profile.data ?? session?.user;
  const submitPassword = async () => { if (!currentPassword || newPassword.length < 8) return toast.error("Enter your current password and a new password of at least 8 characters."); try { await changePassword({ currentPassword, newPassword }).unwrap(); setCurrentPassword(""); setNewPassword(""); setShowForm(false); toast.success("Password changed"); } catch { toast.error("Could not change password."); } };
  const signOut = async () => { if (session?.refreshToken) await logout({ refreshToken: session.refreshToken }).catch(() => undefined); dispatch(clearAgentSession()); router.replace("/agent/login"); };
  return <div className="space-y-6"><AgentPageHeader eyebrow="Account" title="Your staff profile" description="Identity, assigned workplace and account security." /><AgentCard className="overflow-hidden"><div className="bg-[linear-gradient(120deg,#750321,#4c0317)] p-6 text-white sm:p-7"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-2xl bg-white/12 text-xl font-black">{user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#efca72]">Collection agent</p><h1 className="mt-1 text-2xl font-black">{user?.name}</h1><p className="mt-1 text-sm text-white/65">{session?.selectedTenant.displayName}</p></div></div></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><div className="flex items-center gap-3 rounded-xl bg-[#faf7f4] p-4"><Smartphone className="size-5 text-[#730321]" /><div><p className="text-xs font-bold text-[#8c8285]">Mobile</p><p className="mt-0.5 font-black">{user?.mobile ?? "9847012352"}</p></div></div><div className="flex items-center gap-3 rounded-xl bg-[#faf7f4] p-4"><Building2 className="size-5 text-[#a17217]" /><div><p className="text-xs font-bold text-[#8c8285]">Assigned branch</p><p className="mt-0.5 font-black">{user?.branchName ?? "Kochi Main"}</p></div></div><div className="flex items-center gap-3 rounded-xl bg-[#faf7f4] p-4"><UserRound className="size-5 text-[#730321]" /><div><p className="text-xs font-bold text-[#8c8285]">Role</p><p className="mt-0.5 font-black">Collection agent</p></div></div><div className="flex items-center gap-3 rounded-xl bg-[#faf7f4] p-4"><ShieldCheck className="size-5 text-[#087a50]" /><div><p className="text-xs font-bold text-[#8c8285]">Access</p><p className="mt-0.5 font-black text-[#087a50]">Active · branch scoped</p></div></div></div></AgentCard><AgentCard className="p-5 sm:p-6"><button type="button" onClick={() => setShowForm((value) => !value)} className="flex w-full items-center gap-3 text-left"><span className="grid size-11 place-items-center rounded-2xl bg-[#f7edf0] text-[#730321]"><KeyRound className="size-5" /></span><span className="flex-1"><span className="block font-black">Change password</span><span className="mt-0.5 block text-xs text-[#887e81]">Update the password used for staff login</span></span></button>{showForm ? <div className="mt-5 grid gap-4 border-t border-[#eee5e0] pt-5 sm:grid-cols-2"><div><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 h-11 rounded-xl" /></div><div><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 h-11 rounded-xl" /></div><Button onClick={submitPassword} disabled={changeState.isLoading} className="h-11 rounded-xl bg-[#730321] sm:col-span-2">{changeState.isLoading ? "Updating…" : "Update password"}</Button></div> : null}</AgentCard><Button onClick={signOut} variant="outline" className="h-12 w-full rounded-xl border-[#e2c2c6] text-[#a52232] hover:bg-[#fff1f2]"><LogOut className="mr-2 size-4" />Sign out of agent portal</Button></div>;
}
