"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Series } from "@/lib/types";
import { Box, ChevronRight } from "lucide-react";

interface SeriesCardProps {
  series: Series;
  carCount?: number;
}

export default function SeriesCard({ series, carCount }: SeriesCardProps) {
  return (
    <Link href={`/series/${series.id}`}>
      <motion.div
        whileHover={{ y: -5, boxShadow: "0 12px 32px -4px hsl(var(--primary)/0.14), 0 4px 12px -2px hsl(var(--primary)/0.08)", borderColor: "hsl(var(--primary)/0.28)" }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        className="rounded-2xl border border-border/60 bg-card cursor-pointer"
        suppressHydrationWarning
      >
      <Card className="rounded-2xl border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm">
                <Box className="h-5 w-5" />
              </div>
              <div>
                {series.brand && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{series.brand.name}</span>
                  </div>
                )}
                <CardTitle className="text-[15px] font-semibold leading-tight">
                  {series.name}
                </CardTitle>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-5 pb-5">
          <div className="space-y-3">
            <div className="flex items-baseline gap-1.5 font-mono text-sm">
              <span className="text-muted-foreground text-xs font-sans font-medium">尺寸</span>
              <span className="text-foreground font-medium">
                {series.box_length} × {series.box_width} × {series.box_height}
              </span>
              <span className="text-muted-foreground text-xs">mm</span>
            </div>
            {carCount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted/60 rounded-full px-2.5 py-0.5">
                  {carCount} 款车型
                </span>
              </div>
            )}
            {series.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {series.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </Link>
  );
}
