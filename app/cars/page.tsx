"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import CarTable from "@/components/CarTable";
import AddCarDialog from "@/components/AddCarDialog";
import { supabase } from "@/lib/supabase";
import { Car, Series, Brand } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Search,
  Tag, Box, LayoutGrid, X, Pencil, List, Grid2x2, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import { type ViewMode } from "@/components/CarTable";
import { motion } from "framer-motion";

type FilterState =
  | { type: "all" }
  | { type: "brand"; brandId: string }
  | { type: "series"; seriesId: string };

type SortColumn = "brand" | "series" | "production_year" | "number" | "name" | "wheelbase" | "tags" | "notes";
type SortDirection = "desc" | "asc" | null;

interface BrandGroup {
  brand: Brand | null;
  series: Series[];
}

// ─── Edit Brand Dialog ───────────────────────────────────────────────────────
function EditBrandDialog({
  brand,
  open,
  onOpenChange,
  onSuccess,
}: {
  brand: Brand;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(brand.name);
  const [notes, setNotes] = useState(brand.notes || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setName(brand.name); setNotes(brand.notes || ""); }
  }, [open, brand]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("brands").update({ name: name.trim(), notes: notes || null }).eq("id", brand.id);
    setLoading(false);
    if (!error) { onOpenChange(false); onSuccess(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader><DialogTitle>编辑品牌</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label className="text-xs">品牌名称 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="品牌名称" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">备注</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="可选" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Series Dialog ──────────────────────────────────────────────────────
function EditSeriesDialog({
  series,
  brands,
  open,
  onOpenChange,
  onSuccess,
}: {
  series: Series;
  brands: Brand[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(series.name);
  const [brandId, setBrandId] = useState(series.brand_id || "none");
  const [length, setLength] = useState(String(series.box_length));
  const [width, setWidth] = useState(String(series.box_width));
  const [height, setHeight] = useState(String(series.box_height));
  const [notes, setNotes] = useState(series.notes || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(series.name);
      setBrandId(series.brand_id || "none");
      setLength(String(series.box_length));
      setWidth(String(series.box_width));
      setHeight(String(series.box_height));
      setNotes(series.notes || "");
    }
  }, [open, series]);

  const handleSave = async () => {
    if (!name.trim() || !length || !width || !height) return;
    setLoading(true);
    const { error } = await supabase.from("series").update({
      name: name.trim(),
      brand_id: brandId === "none" ? null : brandId,
      box_length: parseFloat(length),
      box_width: parseFloat(width),
      box_height: parseFloat(height),
      notes: notes || null,
    }).eq("id", series.id);
    setLoading(false);
    if (!error) { onOpenChange(false); onSuccess(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>编辑系列</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid gap-2">
            <Label className="text-xs">所属品牌</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="选择品牌（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— 不指定品牌 —</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">系列名称 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="系列名称" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">盒长 (mm) *</Label>
              <Input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">盒宽 (mm) *</Label>
              <Input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">盒高 (mm) *</Label>
              <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">备注</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="可选" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────────────────
function FilterPill({
  active, onClick, icon, label, count, small = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  small?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg transition-colors shrink-0",
        small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
      suppressHydrationWarning
    >
      {icon}
      <span>{label}</span>
      <span className={cn(
        "font-medium tabular-nums rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
        small ? "text-[10px]" : "text-xs",
        active ? "bg-primary-foreground/20" : "bg-background/50"
      )}>{count}</span>
    </motion.button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userTyped = useRef(false);

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;
    const clearIfAutofilled = () => {
      if (input.value && !userTyped.current) {
        input.value = "";
        setSearch("");
      }
    };
    const t1 = setTimeout(clearIfAutofilled, 50);
    const t2 = setTimeout(clearIfAutofilled, 300);
    const t3 = setTimeout(clearIfAutofilled, 800);
    const t4 = setTimeout(clearIfAutofilled, 2000);
    const observer = new MutationObserver(clearIfAutofilled);
    observer.observe(input, { attributes: true, attributeFilter: ["value"] });
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      observer.disconnect();
    };
  }, []);

  const [filter, setFilter] = useState<FilterState>({ type: "all" });
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { isAdmin, passwordDialogOpen, mounted } = useAdmin();

  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [editSeries, setEditSeries] = useState<Series | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let carsResult = await supabase
        .from("cars")
        .select("id, series_id, number, name, wheelbase, notes, image_url, image_urls, tags, production_year, created_at, series(*, brand:brands(*))")
        .order("number");

      if (carsResult.error?.message?.includes("tags")) {
        carsResult = await supabase
          .from("cars")
          .select("id, series_id, number, name, wheelbase, notes, image_url, image_urls, production_year, created_at, series(*, brand:brands(*))")
          .order("number") as any;
      }

      if (carsResult.error?.message?.includes("image_url")) {
        carsResult = await supabase
          .from("cars")
          .select("id, series_id, number, name, wheelbase, notes, image_urls, production_year, created_at, series(*, brand:brands(*))")
          .order("number") as any;
      }

      const [{ data: seriesData }, { data: brandsData }] = await Promise.all([
        supabase.from("series").select("*, brand:brands(*)").order("name"),
        supabase.from("brands").select("*").order("name"),
      ]);

      setCars((carsResult.data || []).map((c: any) => ({ image_url: null, ...c })) as Car[]);
      setSeriesList(seriesData || []);
      setBrands(brandsData || []);
      const ids = new Set<string>((brandsData || []).map((b: Brand) => b.id));
      ids.add("__none__");
      setExpandedBrands(ids);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const brandGroups: BrandGroup[] = [
    ...brands.map((b) => ({
      brand: b,
      series: seriesList.filter((s) => s.brand_id === b.id),
    })),
    {
      brand: null,
      series: seriesList.filter((s) => !s.brand_id),
    },
  ].filter((g) => g.series.length > 0 || g.brand !== null);

  const toggleBrand = (key: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection(column === "number" || column === "name" ? "asc" : "desc");
    }
  };

  const filteredCars = cars.filter((c) => {
    const matchSearch =
      !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.number || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.series?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.series?.brand?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.production_year?.toString() || "").includes(search);

    const matchFilter =
      filter.type === "all"
        ? true
        : filter.type === "brand"
        ? c.series?.brand_id === filter.brandId
        : c.series_id === filter.seriesId;

    return matchSearch && matchFilter;
  }).sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const dir = sortDirection === "desc" ? -1 : 1;

    switch (sortColumn) {
      case "brand":
        const brandA = a.series?.brand?.name || "";
        const brandB = b.series?.brand?.name || "";
        return dir * brandA.localeCompare(brandB, "zh-CN");
      case "series":
        const seriesA = a.series?.name || "";
        const seriesB = b.series?.name || "";
        return dir * seriesA.localeCompare(seriesB, "zh-CN");
      case "production_year":
        const yearA = a.production_year ?? Infinity;
        const yearB = b.production_year ?? Infinity;
        return dir * (yearA - yearB);
      case "number":
        const extractNumber = (str: string | null | undefined): number => {
          if (!str) return Infinity;
          const match = str.match(/\d+/);
          return match ? parseInt(match[0], 10) : Infinity;
        };
        const numA = extractNumber(a.number);
        const numB = extractNumber(b.number);
        return dir * (numA - numB);
      case "name":
        const nameA = a.name || "";
        const nameB = b.name || "";
        return dir * nameA.localeCompare(nameB, "zh-CN");
      case "wheelbase":
        const wbA = a.wheelbase ?? Infinity;
        const wbB = b.wheelbase ?? Infinity;
        return dir * (wbA - wbB);
      case "tags":
        const tagsA = a.tags?.join(",") || "";
        const tagsB = b.tags?.join(",") || "";
        return dir * tagsA.localeCompare(tagsB);
      case "notes":
        const notesA = a.notes || "";
        const notesB = b.notes || "";
        return dir * notesA.localeCompare(notesB, "zh-CN");
      default:
        return 0;
    }
  });

  const totalCount = cars.length;

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* ── MAIN CONTENT ── */}
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.06 }}
        suppressHydrationWarning
      >
        {/* Search + view toggle + add button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={searchInputRef}
              placeholder="搜索车名、编号、系列..."
              value={search}
              onChange={(e) => { userTyped.current = true; setSearch(e.target.value); }}
              className="pl-10 h-10 rounded-xl border-border/60 bg-card shadow-sm focus-visible:ring-primary/30"
              autoComplete="off"
              name="filter-keyword"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 p-0.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-border/60 bg-card shadow-sm p-0.5 shrink-0">
            <motion.button
              onClick={() => setViewMode("list")}
              title="列表模式"
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              suppressHydrationWarning
            >
              <List className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode("grid")}
              title="卡片模式"
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              suppressHydrationWarning
            >
              <Grid2x2 className="h-4 w-4" />
            </motion.button>
          </div>
          {/* Add button - always rendered, hidden with opacity */}
          <div className={cn((!mounted || !isAdmin) && "opacity-0 pointer-events-none")}>
            <AddCarDialog onSuccess={fetchData} />
          </div>
        </div>

        {/* Filter Bar — 全部 + 品牌 + (选中品牌时内联展开系列) */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">

            {/* 全部 */}
            <FilterPill
              active={filter.type === "all"}
              onClick={() => setFilter({ type: "all" })}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="全部"
              count={totalCount}
            />

            {brands.map((brand) => {
              const brandCarCount = cars.filter((c) => c.series?.brand_id === brand.id).length;
              const isActiveBrand = filter.type === "brand" && filter.brandId === brand.id;
              const activeBrandId =
                filter.type === "brand" ? filter.brandId
                : filter.type === "series" ? (seriesList.find((s) => s.id === filter.seriesId)?.brand_id ?? null)
                : null;
              const isExpanded = activeBrandId === brand.id;
              const brandSeries = seriesList.filter((s) => s.brand_id === brand.id);

              return (
                <div key={brand.id} className="flex items-center gap-2 flex-wrap">
                  {/* 品牌 pill */}
                  <div className="flex items-center gap-1 group/brand">
                    <FilterPill
                      active={isActiveBrand}
                      onClick={() => setFilter({ type: "brand", brandId: brand.id })}
                      icon={<Tag className="h-3.5 w-3.5" />}
                      label={brand.name}
                      count={brandCarCount}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditBrand(brand); }}
                      className={cn(
                        "transition-opacity p-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                        (!mounted || !isAdmin) ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/brand:opacity-100"
                      )}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>

                  {/* 系列 pills — 内联展开，仅当该品牌被选中时显示 */}
                  {isExpanded && brandSeries.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 分隔符 */}
                      <span className="text-border/80 text-lg leading-none select-none">›</span>
                      {brandSeries.map((s) => {
                        const seriesCarCount = cars.filter((c) => c.series_id === s.id).length;
                        const isActiveSeries = filter.type === "series" && filter.seriesId === s.id;
                        return (
                          <div key={s.id} className="flex items-center gap-1 group/series">
                            <FilterPill
                              active={isActiveSeries}
                              onClick={() => setFilter({ type: "series", seriesId: s.id })}
                              icon={<Box className="h-3 w-3" />}
                              label={s.name}
                              count={seriesCarCount}
                              small
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditSeries(s); }}
                              className={cn(
                                "transition-opacity p-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                                (!mounted || !isAdmin) ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/series:opacity-100"
                              )}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className={cn("flex items-center justify-center py-32", mounted && !loading && "hidden")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div className={cn(mounted && loading && "hidden")}>
          <CarTable
            cars={filteredCars}
            showSeries={false}
            onRefresh={fetchData}
            viewMode={viewMode}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </motion.div>

      {/* ── EDIT DIALOGS ── */}
      {editBrand && (
        <EditBrandDialog
          brand={editBrand}
          open={!!editBrand}
          onOpenChange={(v) => !v && setEditBrand(null)}
          onSuccess={() => { setEditBrand(null); fetchData(); }}
        />
      )}
      {editSeries && (
        <EditSeriesDialog
          series={editSeries}
          brands={brands}
          open={!!editSeries}
          onOpenChange={(v) => !v && setEditSeries(null)}
          onSuccess={() => { setEditSeries(null); fetchData(); }}
        />
      )}
    </div>
  );
}
