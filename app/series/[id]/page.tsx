"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import CarTable from "@/components/CarTable";
import AddCarDialog from "@/components/AddCarDialog";
import { supabase } from "@/lib/supabase";
import { Series, Car } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Box, Loader2, Ruler, Tag } from "lucide-react";
import { useAdmin } from "@/lib/admin-context";

export default function SeriesDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { isAdmin, mounted } = useAdmin();
  const [series, setSeries] = useState<Series | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: seriesData, error: se }, { data: carsData, error: ce }] =
        await Promise.all([
          supabase.from("series").select("*, brand:brands(*)").eq("id", id).single(),
          supabase
            .from("cars")
            .select("*")
            .eq("series_id", id)
            .order("created_at", { ascending: true }),
        ]);

      if (se || !seriesData) {
        notFound();
        return;
      }
      if (ce) throw ce;

      setSeries(seriesData);
      setCars(carsData || []);
    } catch (err) {
      console.error("Error fetching series detail:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!series) return null;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground rounded-xl">
        <Link href="/series">
          <ChevronLeft className="h-4 w-4" />
          返回系列列表
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm shrink-0">
            <Box className="h-7 w-7" />
          </div>
          <div>
            {series.brand && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-sm font-medium text-primary/80">{series.brand.name}</span>
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight">{series.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground bg-muted/60 rounded-full px-3 py-0.5">
                <Ruler className="h-3.5 w-3.5" />
                {series.box_length} × {series.box_width} × {series.box_height} mm
              </span>
              <span className="text-sm font-medium text-muted-foreground bg-muted/60 rounded-full px-3 py-0.5">
                {cars.length} 款车型
              </span>
            </div>
            {series.notes && (
              <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed max-w-xl">{series.notes}</p>
            )}
          </div>
        </div>
        {mounted && isAdmin && (
          <AddCarDialog
            defaultSeriesId={series.id}
            onSuccess={fetchData}
          />
        )}
      </div>

      {/* Box dimensions card */}
      <div className="grid grid-cols-3 gap-0 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="text-center py-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">盒长</p>
          <p className="text-3xl font-bold font-mono text-foreground">{series.box_length}</p>
          <p className="text-xs text-muted-foreground mt-1">mm</p>
        </div>
        <div className="text-center py-6 px-4 border-x border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">盒宽</p>
          <p className="text-3xl font-bold font-mono text-foreground">{series.box_width}</p>
          <p className="text-xs text-muted-foreground mt-1">mm</p>
        </div>
        <div className="text-center py-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">盒高</p>
          <p className="text-3xl font-bold font-mono text-foreground">{series.box_height}</p>
          <p className="text-xs text-muted-foreground mt-1">mm</p>
        </div>
      </div>

      {/* Cars table */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">车型列表</h2>
        <CarTable cars={cars} onRefresh={fetchData} />
      </div>
    </div>
  );
}
