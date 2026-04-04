"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Series } from "@/lib/types";
import { Box, ChevronRight } from "lucide-react";

interface SeriesCardProps {
  series: Series;
  carCount?: number;
}

export default function SeriesCard({ series, carCount }: SeriesCardProps) {
  return (
    <Link href={`/series/${series.id}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Box className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold leading-tight">
                {series.name}
              </CardTitle>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">尺寸</span>
              <span>
                {series.box_length} × {series.box_width} × {series.box_height} mm
              </span>
            </div>
            {carCount !== undefined && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {carCount} 款车型
                </Badge>
              </div>
            )}
            {series.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {series.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
