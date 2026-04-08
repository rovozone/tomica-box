"use client";

import { useEffect, useState, useCallback } from "react";
import SeriesCard from "@/components/SeriesCard";
import AddSeriesDialog from "@/components/AddSeriesDialog";
import AddBrandDialog from "@/components/AddBrandDialog";
import { supabase } from "@/lib/supabase";
import { Series, Brand } from "@/lib/types";
import { Box, Loader2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SeriesWithCount extends Series {
  car_count: number;
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesWithCount[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    const { data } = await supabase.from("brands").select("*").order("name");
    setBrands(data || []);
  }, []);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("*, brand:brands(*)")
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

  const handleBrandAdded = useCallback(async () => {
    await fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    fetchBrands();
    fetchSeries();
  }, [fetchBrands, fetchSeries]);

  const filteredSeries =
    selectedBrandId === "all"
      ? seriesList
      : selectedBrandId === "none"
      ? seriesList.filter((s) => !s.brand_id)
      : seriesList.filter((s) => s.brand_id === selectedBrandId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系列管理</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            管理各品牌包装盒系列及其尺寸参数
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddBrandDialog onSuccess={handleBrandAdded} />
          <AddSeriesDialog
            brands={brands}
            onSuccess={fetchSeries}
            onBrandAdded={handleBrandAdded}
          />
        </div>
      </div>

      {/* Brand filter tabs */}
      {brands.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedBrandId("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              selectedBrandId === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            全部
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBrandId(b.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                selectedBrandId === b.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {b.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedBrandId("none")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              selectedBrandId === "none"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            未分类
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Box className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-base font-medium">
            {selectedBrandId === "all" ? "还没有任何系列" : "该品牌下暂无系列"}
          </p>
          <p className="text-sm mt-1">点击右上角「新增系列」开始添加</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground tabular-nums">{filteredSeries.length}</span> 个系列
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSeries.map((series) => (
              <SeriesCard
                key={series.id}
                series={series}
                carCount={series.car_count}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
