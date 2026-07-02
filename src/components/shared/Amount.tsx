import { formatting } from "@/lib/design/tokens";

interface AmountProps {
  value: number;
  variant?: "in" | "out" | "commission" | "neutral";
  className?: string;
  showSign?: boolean;
}

export function Amount({ value, variant = "neutral", className = "", showSign = false }: AmountProps) {
  const formatter = new Intl.NumberFormat(formatting.locale, {
    style: "currency",
    currency: formatting.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formattedValue = formatter.format(Math.abs(value));
  const sign = showSign ? (value > 0 ? "+" : value < 0 ? "-" : "") : "";

  let colorClass = "text-foreground";
  switch (variant) {
    case "in":
      colorClass = "text-money-in";
      break;
    case "out":
      colorClass = "text-money-out";
      break;
    case "commission":
      colorClass = "text-commission";
      break;
    case "neutral":
      colorClass = "text-foreground";
      break;
  }

  return (
    <span className={`tabular-nums font-semibold ${colorClass} ${className}`}>
      {sign}
      {formattedValue}
    </span>
  );
}
