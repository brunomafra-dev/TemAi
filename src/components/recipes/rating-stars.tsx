"use client";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

const steps = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function RatingStars({ value, onChange, readonly = false, size = "md" }: RatingStarsProps) {
  const starSize = size === "sm" ? "text-sm" : "text-xl";

  function renderStar(index: number): string {
    const starNumber = index + 1;
    if (value >= starNumber) {
      return "★";
    }
    if (value >= starNumber - 0.5) {
      return "⯨";
    }
    return "☆";
  }

  return (
    <div className="space-y-1">
      <div className={cn("leading-none tracking-[0.06em] text-[#C9A86A]", starSize)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={`star-${index}`}>{renderStar(index)}</span>
        ))}
      </div>
      {!readonly ? (
        <div className="flex flex-wrap gap-1.5">
          {steps.map((step) => (
            <button
              key={`step-${step}`}
              onClick={() => onChange?.(step)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition",
                step === value
                  ? "border-[#C9A86A] bg-[#F6EFDF] text-[#7D6139]"
                  : "border-[#E5D7BF] bg-[#FFFCF7] text-[#857A6E]",
              )}
            >
              {step.toFixed(1).replace(".0", "")}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
