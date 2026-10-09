"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { REFERRAL_TIERS } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";

const INVITE_GOAL = 5;
const ENROLL_GOAL = 3;
const BASE_FEE = REFERRAL_TIERS[0].feeVnd;

/**
 * Which REFERRAL_TIERS step the reader would reach. Illustration of the public poster only:
 * a real student's tier comes from the API (CLAUDE.md §7).
 */
function tierFor(invited: number, enrolled: number) {
  if (invited < INVITE_GOAL) return 0;
  if (enrolled >= ENROLL_GOAL) return 3;
  if (enrolled >= 1) return 2;
  return 1;
}

function nextStep(invited: number, enrolled: number, tier: number) {
  switch (tier) {
    case 0:
      return `Mời thêm ${INVITE_GOAL - invited} bạn học thử để giảm còn ${formatVnd(REFERRAL_TIERS[1].feeVnd)}.`;
    case 1:
      return `Thêm 1 bạn học chính thức để giảm còn ${formatVnd(REFERRAL_TIERS[2].feeVnd)}.`;
    case 2:
      return `Thêm ${ENROLL_GOAL - enrolled} bạn học chính thức nữa là bạn học miễn phí.`;
    default:
      return `RVPY hoàn lại ${formatVnd(REFERRAL_TIERS[2].feeVnd)}, khoá học của bạn miễn phí.`;
  }
}

/** "Thử tính học phí": the reader plays with referral counts and watches the fee fall. */
export function FeeCalculator() {
  const [invited, setInvited] = useState(0);
  const [enrolled, setEnrolled] = useState(0);
  const tier = tierFor(invited, enrolled);
  const fee = REFERRAL_TIERS[tier].feeVnd;
  const shown = Math.round(useCountUp(fee, 600) / 1000) * 1000;

  const changeInvited = (v: number) => {
    setInvited(v);
    setEnrolled((e) => Math.min(e, v)); // an enrolled friend has done the trial first
  };

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[1.15fr_1fr]">
      {/* Controls + result */}
      <div className="grid content-start gap-7 p-6 md:p-10">
        <div>
          <p className="font-mono text-[13px] tracking-[.08em] text-primary uppercase">
            Thử tính học phí
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Chỉnh số bạn bè để xem học phí của bạn còn bao nhiêu.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Stepper
            label="Bạn bè học thử 3 buổi"
            value={invited}
            max={INVITE_GOAL}
            onChange={changeInvited}
          />
          <Stepper
            label="Trong đó học chính thức"
            value={enrolled}
            max={Math.min(ENROLL_GOAL, invited)}
            onChange={setEnrolled}
          />
        </div>

        {/* Five friends: outline = not yet, soft = did the trial, solid = enrolled. */}
        <ul aria-hidden className="flex gap-2">
          {Array.from({ length: INVITE_GOAL }, (_, i) => {
            const state =
              i < enrolled ? "enrolled" : i < invited ? "trial" : "none";
            return (
              <li
                key={i}
                className={cn(
                  "grid size-11 place-items-center rounded-full border font-mono text-[14px] transition-colors duration-300",
                  state === "enrolled" &&
                    "border-primary bg-primary text-primary-foreground",
                  state === "trial" &&
                    "border-primary/50 bg-primary-soft text-primary",
                  state === "none" &&
                    "border-dashed border-border text-muted-foreground",
                )}
              >
                {i + 1}
              </li>
            );
          })}
        </ul>

        <div
          aria-live="polite"
          className="grid gap-1 border-t border-border pt-6"
        >
          <p className="text-[13px] text-muted-foreground">Học phí của bạn</p>
          <p className="font-heading text-[40px] leading-tight font-light tabular-nums md:text-[56px]">
            {fee === 0 && shown === 0 ? (
              <strong className="font-medium text-primary">Miễn phí</strong>
            ) : (
              <>
                {formatVnd(shown)}
                {fee < BASE_FEE && (
                  <span className="ml-3 align-middle font-mono text-[14px] text-muted-foreground line-through">
                    {formatVnd(BASE_FEE)}
                  </span>
                )}
              </>
            )}
          </p>
          <p className="text-[15px]">{nextStep(invited, enrolled, tier)}</p>
        </div>
      </div>

      {/* Tier ladder */}
      <ol className="grid content-center gap-2 border-t border-border bg-background-2/60 p-6 md:p-10 lg:border-t-0 lg:border-l">
        {REFERRAL_TIERS.map((t, i) => {
          const passed = i < tier;
          const current = i === tier;
          return (
            <li
              key={t.title}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3.5 transition-colors duration-300",
                current ? "border-primary bg-card" : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border font-mono text-[12px] transition-colors duration-300",
                  current &&
                    "border-primary bg-primary text-primary-foreground",
                  passed && "border-primary text-primary",
                  !current && !passed && "border-border text-muted-foreground",
                )}
              >
                {passed ? (
                  <Check
                    strokeWidth={2.25}
                    className="size-4"
                    aria-label="Đã đạt"
                  />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <span className="grid">
                <span
                  className={cn(
                    "text-[15px] font-medium",
                    !current && !passed && "text-muted-foreground",
                  )}
                >
                  {t.title}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {t.condition}
                </span>
              </span>
              <span
                className={cn(
                  "text-right font-mono text-[13px] tabular-nums",
                  current
                    ? "text-primary"
                    : passed
                      ? "text-muted-foreground line-through"
                      : "text-muted-foreground",
                )}
              >
                {t.feeVnd === 0 ? "0đ" : formatVnd(t.feeVnd)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Giảm: ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          <Minus strokeWidth={1.75} />
        </Button>
        <output className="w-14 text-center font-mono text-[21px] tabular-nums">
          {value}
        </output>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Tăng: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
