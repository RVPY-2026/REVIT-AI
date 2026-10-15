"use client";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { LEARNING_PRIMARY_BACKGROUND } from "@/lib/learning-content";

/** Use the existing deep accent token for AA contrast across the entire label. */
export function LearningPrimaryButton(props: Omit<ComponentProps<typeof Button>, "variant">) {
  return <Button data-learning-primary="true" {...props} style={{ ...props.style, background: LEARNING_PRIMARY_BACKGROUND }} />;
}
