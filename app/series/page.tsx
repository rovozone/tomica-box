"use client";

import { useEffect, useState, useCallback } from "react";
import SeriesCard from "@/components/SeriesCard";
import AddSeriesDialog from "@/components/AddSeriesDialog";
import { supabase } from "@/lib/supabase";
import { Series } from "@/lib/types";
import { Box, Loader2 } from "lucide-react";

interface SeriesWithCount extends Series {
  car_count: number;
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("*")
        .order("created_at", { ascending: false });

      if (seriesError) throw seriesError;

      const { data: carCounts, error: carError } = await supabase
        .from("cars")
        .select("series_id");

      if (carError) throw carError;

      const countMap: Record<string, number> = {};
      carCounts?.forEach((c) => {
        countMap[c.series_id] = (countMap[c.series_id] || 0) + 1;
      });

      const merged = (seriesData || []).map((s) => ({
        ...s,
        car_count: countMap[s.id] || 0,
      }));

      setSeriesList(merged);
    } catch (err) {
      console.error("Error fetching series:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系列管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理 Tomica 包装盒系列及其尺寸参数
          </p>
        </div>
        <AddSeriesDialog onSuccess={fetchSeries} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : seriesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Box className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-base font-medium">还没有任何系列</p>
          <p className="text-sm mt-1">点击右上角「新增系列」开始添加</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              carCount={series.car_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
