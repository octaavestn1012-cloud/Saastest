import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  colorClass?: string;
}

export function ProgressBar({ value, colorClass = "bg-primary", className, ...props }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  
  return (
    <div 
      className={cn("h-3 w-full overflow-hidden rounded-full bg-black/5", className)}
      {...props}
    >
      <div 
        className={cn("h-full transition-all duration-500 ease-out", colorClass)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}
