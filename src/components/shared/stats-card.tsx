"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  format?: "number" | "percentage" | "none";
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  format = "number",
  className,
}: StatsCardProps) {
  const formattedValue =
    format === "number" && typeof value === "number"
      ? formatNumber(value)
      : format === "percentage" && typeof value === "number"
        ? formatPercentage(value)
        : value;

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {formattedValue}
          </p>
          {change !== undefined && (
            <span
              className={cn(
                "text-sm font-medium",
                isPositive ? "text-[#039855]" : "text-destructive"
              )}
            >
              {isPositive ? "+" : ""}
              {formatPercentage(change)}
            </span>
          )}
        </div>
        {changeLabel && (
          <p className="mt-1 text-xs text-muted-foreground">
            {changeLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
