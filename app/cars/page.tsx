"use client";

import { useEffect, useState, useCallback } from "react";
import CarTable from "@/components/CarTable";
import AddCarDialog from "@/components/AddCarDialog";
import { supabase } from "@/lib/supabase";
import { Car, Series } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: carsData, error: ce }, { data: seriesData, error: se }] =
        await Promise.all([
          supabase
            .from("cars")
            .select("*, series(*)")
            .order("created_at", { ascending: false }),
          supabase
            .from("series")
            .select("*")
            .order("name", { ascending: true }),
        ]);

      if (ce) throw ce;
      if (se) throw se;

      setCars(carsData || []);
      setSeriesList(seriesData || []);
    } catch (err) {
      console.error("Error fetching cars:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCars = cars.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.number && c.number.toLowerCase().includes(search.toLowerCase())) ||
      (c.series?.name && c.series.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">所有车型</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看全部 {cars.length} 款 Tomica 车型数据
          </p>
        </div>
        <AddCarDialog seriesList={seriesList} onSuccess={fetchData} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索车型名称、编号、系列..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {search && (
            <p className="text-sm text-muted-foreground mb-3">
              找到 {filteredCars.length} 条结果
            </p>
          )}
          <CarTable cars={filteredCars} showSeries />
        </div>
      )}
    </div>
  );
}
