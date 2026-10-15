"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function ManagementRefreshButton({ label }: { label: string }) {
  const router = useRouter(); const [pending, start] = useTransition();
  return <Button className="min-h-11" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Đang tải lại…" : label}</Button>;
}
