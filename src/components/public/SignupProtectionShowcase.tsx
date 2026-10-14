"use client";

import { SignupVerification } from "@/components/public/SignupVerification";
import { ZaloBotLinkCard } from "@/components/public/ZaloBotLinkCard";

export function SignupProtectionShowcase() {
  return <div className="grid gap-4 md:grid-cols-2">
    <SignupVerification preview resetKey={0} onToken={() => undefined} />
    <ZaloBotLinkCard token={null} connected />
  </div>;
}
