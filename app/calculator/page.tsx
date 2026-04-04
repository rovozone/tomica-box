"use client";

import { useEffect, useState, useCallback } from "react";
import Calculator from "@/components/Calculator";
import { supabase } from "@/lib/supabase";
import { Car, Series } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function CalculatorPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: carsData, error: ce }, { data: seriesData, error: se }] =
        await Promise.all([
          supabase
            .from("cars")
            .select("*, series(*)")
            .order("name", { ascending: true }),
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
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">车轮限位计算器</h1>
        <p className="text-sm text-muted-foreground mt-1">
          根据轮距和轮宽自动计算收纳盒车轮限位中心位置
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Calculator cars={cars} seriesList={seriesList} />
      )}
    </div>
  );
}
