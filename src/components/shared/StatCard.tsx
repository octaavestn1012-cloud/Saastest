"use client";

import { Amount } from "./Amount";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  amount?: number;
  customValueNode?: ReactNode;
  deltaPercent?: number;
  deltaLabel?: string;
  icon: ReactNode;
  iconBgColorClass?: string;
  amountVariant?: "neutral" | "in" | "out" | "commission";
  className?: string;
}

export function StatCard({
  title,
  amount,
  customValueNode,
  deltaPercent,
  deltaLabel,
  icon,
  iconBgColorClass = "bg-primary/10 text-primary",
  amountVariant = "neutral",
  className = "",
}: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative p-6 sm:p-8 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col justify-between h-full border border-black/[0.03] ${className}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center ${iconBgColorClass}`}>
          {icon}
        </div>
        
        {deltaPercent !== undefined && (
          <div className="text-right">
            <div className={`text-sm font-bold ${deltaPercent >= 0 ? "text-money-in" : "text-danger"}`}>
              {deltaPercent >= 0 ? "+" : ""}{deltaPercent}%
            </div>
            {deltaLabel && <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{deltaLabel}</div>}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <h3 className="text-sm font-semibold text-muted-foreground mb-1">{title}</h3>
        {customValueNode ? (
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {customValueNode}
          </div>
        ) : amount !== undefined ? (
          <div className="text-4xl font-extrabold tracking-tight text-foreground">
            <Amount value={amount} variant={amountVariant} />
          </div>
        ) : (
          <div className="text-4xl font-extrabold tracking-tight text-muted/50">-</div>
        )}
      </div>
    </motion.div>
  );
}
