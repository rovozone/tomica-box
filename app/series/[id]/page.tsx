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
import { ChevronLeft, Box, Loader2, Ruler } from "lucide-react";

export default function SeriesDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: seriesData, error: se }, { data: carsData, error: ce }] =
        await Promise.all([
          supabase.from("series").select("*").eq("id", id).single(),
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/series">
          <ChevronLeft className="h-4 w-4" />
          返回系列列表
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{series.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs gap-1">
                <Ruler className="h-3 w-3" />
                {series.box_length} × {series.box_width} × {series.box_height} mm
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {cars.length} 款车型
              </Badge>
            </div>
            {series.notes && (
              <p className="text-sm text-muted-foreground mt-2">{series.notes}</p>
            )}
          </div>
        </div>
        <AddCarDialog
          seriesList={[series]}
          defaultSeriesId={series.id}
          onSuccess={fetchData}
        />
      </div>

      {/* Box dimensions card */}
      <div className="grid grid-cols-3 gap-4 rounded-xl border bg-muted/20 p-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">盒长</p>
          <p className="text-xl font-bold font-mono">{series.box_length}</p>
          <p className="text-xs text-muted-foreground">mm</p>
        </div>
        <div className="text-center border-x">
          <p className="text-xs text-muted-foreground">盒宽</p>
          <p className="text-xl font-bold font-mono">{series.box_width}</p>
          <p className="text-xs text-muted-foreground">mm</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">盒高</p>
          <p className="text-xl font-bold font-mono">{series.box_height}</p>
          <p className="text-xs text-muted-foreground">mm</p>
        </div>
      </div>

      {/* Cars table */}
      <div>
        <h2 className="text-base font-semibold mb-3">车型列表</h2>
        <CarTable cars={cars} />
      </div>
    </div>
  );
}
