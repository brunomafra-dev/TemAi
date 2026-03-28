"use client";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function RatingStars({ value, onChange, readonly = false, size = "md" }: RatingStarsProps) {
  const starSize = size === "sm" ? "text-sm" : "text-xl";
  const normalizedValue = Math.max(0, Math.min(10, value || 0));
  const starValue = normalizedValue / 2;

  function renderStar(index: number) {
    const starNumber = index + 1;
    if (starValue >= starNumber) {
      return <span className="text-[#C66A3D]">{"\u2605"}</span>;
    }
    if (starValue >= starNumber - 0.5) {
      return <span className="text-[#C66A3D] opacity-50">{"\u2605"}</span>;
    }
    return <span className="text-[#C66A3D]">{"\u2606"}</span>;
  }

  return (
    <div className="space-y-1">
      <div className={cn("leading-none tracking-[0.06em]", starSize)}>
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
                step === normalizedValue
                  ? "border-[#C66A3D] bg-[#F8E8E1] text-[#7A4733]"
                  : "border-[#E5D7BF] bg-[#FFFCF7] text-[#857A6E]",
              )}
            >
              {step}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
