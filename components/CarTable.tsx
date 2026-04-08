"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Car } from "@/lib/types";
import { Car as CarIcon, Pencil, Trash2, ImageOff, Ruler, Tag, X, StickyNote, ChevronUp, ChevronDown } from "lucide-react";
import AddCarDialog from "@/components/AddCarDialog";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import { useAdmin } from "@/lib/admin-context";

export type ViewMode = "list" | "grid";

export type SortColumn = "brand" | "series" | "production_year" | "number" | "name" | "wheelbase" | "tags" | "notes";
export type SortDirection = "desc" | "asc" | null;

/** 可排序的表头 */
function SortableHeader({
  column,
  label,
  currentSortColumn,
  currentSortDirection,
  onSort,
  className,
}: {
  column: SortColumn;
  label: string;
  currentSortColumn?: SortColumn | null;
  currentSortDirection?: SortDirection;
  onSort?: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentSortColumn === column;
  const showDown = currentSortDirection === "desc";
  const showUp = currentSortDirection === "asc";

  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort?.(column)}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
      >
        {label}
        {isActive && (
          <span className="flex items-center">
            {showDown && <ChevronDown className="h-3.5 w-3.5" />}
            {showUp && <ChevronUp className="h-3.5 w-3.5" />}
          </span>
        )}
      </button>
    </TableHead>
  );
}

/** 取第一张可用图片 URL */
function firstImage(car: Car): string | null {
  if (car.image_urls?.length) return car.image_urls[0];
  return car.image_url || null;
}

/** 取所有图片 URL 列表 */
function allImages(car: Car): string[] {
  if (car.image_urls?.length) return car.image_urls;
  if (car.image_url) return [car.image_url];
  return [];
}

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const VELOCITY_THRESHOLD = 500;

/** 图片卡片：framer-motion drag + spring，支持触控板/触摸/鼠标 */
function ImageCard({
  imgs, idx, onPrev, onNext, onDot, altText,
}: {
  imgs: string[];
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  altText: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  useEffect(() => {
    x.set(0);
  }, [idx, x]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const W = containerRef.current?.offsetWidth ?? 502;
    const { offset, velocity } = info;
    const goNext = offset.x < -(W * 0.25) || velocity.x < -VELOCITY_THRESHOLD;
    const goPrev = offset.x > (W * 0.25) || velocity.x > VELOCITY_THRESHOLD;

    if (goNext && idx < imgs.length - 1) {
      animate(x, -W, { ...SPRING, onComplete: () => { onNext(); } });
    } else if (goPrev && idx > 0) {
      animate(x, W, { ...SPRING, onComplete: () => { onPrev(); } });
    } else {
      animate(x, 0, SPRING);
    }
  };

  return (
    <motion.div
      className="absolute rounded-2xl bg-white border border-border/20 shadow-2xl"
      style={{
        zIndex: 2,
        bottom: "20px",
        left: "-20px",
        width: "530px",
        height: "530px",
        padding: "14px",
        boxSizing: "border-box",
      }}
      initial={{ opacity: 0, rotate: -6, x: -20 }}
      animate={{ opacity: 1, rotate: -3, x: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      suppressHydrationWarning
    >
      {imgs.length > 1 && imgs.map((src, i) =>
        i !== idx
          ? <img key={src} src={src} alt="" aria-hidden className="hidden" />
          : null
      )}

      <div ref={containerRef} className="w-full h-full rounded-[2px] overflow-hidden relative select-none">
        {imgs.length > 0 ? (
          <motion.div
            className="w-full h-full"
            drag={imgs.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            style={{ x, cursor: imgs.length > 1 ? "grab" : "default", willChange: "transform" }}
            whileDrag={{ cursor: "grabbing" }}
            onDragEnd={handleDragEnd}
          >
            <img
              src={imgs[idx]}
              alt={altText}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground/20">
            <ImageOff className="h-12 w-12" />
          </div>
        )}

        {imgs.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-sm z-10"
              aria-label="上一张"
            >‹</button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-sm z-10"
              aria-label="下一张"
            >›</button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onDot(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all pointer-events-auto ${i === idx ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"}`}
                  aria-label={`第${i + 1}张`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

interface CarTableProps {
  cars: Car[];
  showSeries?: boolean;
  onRefresh: () => void;
  viewMode?: ViewMode;
  sortColumn?: SortColumn | null;
  sortDirection?: SortDirection;
  onSort?: (column: SortColumn) => void;
}

export default function CarTable({ cars, showSeries = false, onRefresh, viewMode = "list", sortColumn, sortDirection, onSort }: CarTableProps) {
  const { isAdmin, mounted } = useAdmin();
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("cars").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    onRefresh();
  };

  if (cars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CarIcon className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">暂无车型数据</p>
        <p className="text-xs mt-1">点击「新增车型」添加第一款车型</p>
      </div>
    );
  }

  return (
    <>
      {/* ── GRID VIEW ── */}
      {viewMode === "grid" && (
        <motion.div
          className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          suppressHydrationWarning
        >
          {cars.map((car) => (
            <motion.button
              key={car.id}
              onClick={() => { setDetailCar(car); setSlideIndex(0); }}
              className="group text-left rounded-2xl bg-card shadow-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex flex-col"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
              }}
              whileHover={{ y: -4, boxShadow: "0 8px 24px -4px hsl(var(--primary)/0.12), 0 2px 8px -2px hsl(var(--primary)/0.08)", transition: { type: "spring", stiffness: 400, damping: 25 } }}
              whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 500, damping: 30 } }}
              suppressHydrationWarning
            >
              <div className="aspect-square bg-muted/30 overflow-hidden relative flex-shrink-0">
                {firstImage(car) ? (
                  <img
                    src={firstImage(car)!}
                    alt={car.name || car.number || ""}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5 flex-shrink-0">
                {car.number && (
                  <span className="inline-block font-mono text-[11px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5 leading-none">
                    {car.number}
                  </span>
                )}
                <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground">
                  {car.name || <span className="text-muted-foreground/40">—</span>}
                </p>
                {car.wheelbase != null && (
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {car.wheelbase} <span className="font-sans">mm</span>
                  </p>
                )}
                {car.tags && car.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {car.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-normal rounded-md px-1.5 py-0.5 bg-primary/8 text-primary/70 leading-none">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="w-[70px] py-3"></TableHead>
                <SortableHeader column="brand" label="品牌" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="w-[90px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="series" label="系列" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="w-[110px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="production_year" label="生产年份" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="w-[90px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="number" label="编号" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="w-[90px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="tags" label="标签" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="w-[140px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="name" label="车型名称" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="min-w-[180px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="notes" label="备注" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="hidden md:table-cell w-[160px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <SortableHeader column="wheelbase" label="轮距" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSort={onSort} className="text-right w-[80px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" />
                <TableHead className="w-[70px] py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.map((car) => (
                <TableRow key={car.id} className="hover:bg-primary/[0.03] group align-middle border-b border-border/40 last:border-0 transition-colors">
                  <TableCell className="p-2.5">
                    {firstImage(car) ? (
                      <motion.button
                        onClick={() => { setDetailCar(car); setSlideIndex(0); }}
                        className="block w-14 h-14 rounded-xl overflow-hidden border border-border/60 bg-muted/20 shrink-0 shadow-sm"
                        whileHover={{ scale: 1.08, boxShadow: "0 0 0 2px hsl(var(--primary)/0.4)", transition: { type: "spring", stiffness: 400, damping: 25 } }}
                        whileTap={{ scale: 0.95 }}
                        suppressHydrationWarning
                      >
                        <img
                          src={firstImage(car)!}
                          alt={car.name || car.number || ""}
                          className="w-full h-full object-cover"
                        />
                      </motion.button>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-muted-foreground/25">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {car.series?.brand ? (
                      <span className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block">{car.series.brand.name}</span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {car.series ? (
                      <Badge variant="secondary" className="text-xs w-fit rounded-lg whitespace-nowrap">{car.series.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5">
                    {car.production_year != null
                      ? <span className="text-sm text-foreground font-medium tabular-nums">{car.production_year}</span>
                      : <span className="text-muted-foreground/40 text-xs">—</span>
                    }
                  </TableCell>

                  <TableCell className="py-3.5">
                    {car.number
                      ? <Badge variant="outline" className="font-mono text-xs rounded-lg border-border/60 whitespace-nowrap">{car.number}</Badge>
                      : <span className="text-muted-foreground/40 text-xs">—</span>
                    }
                  </TableCell>

                  <TableCell className="py-3.5">
                    {car.tags && car.tags.length > 0 ? (
                      <div className="flex gap-1.5 overflow-hidden">
                        {car.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs font-normal rounded-lg py-0.5 px-2 bg-primary/8 text-primary/80 border-0 whitespace-nowrap">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3.5 font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {car.name || <span className="text-muted-foreground/40 text-xs">—</span>}
                  </TableCell>

                  <TableCell className="hidden md:table-cell py-3.5 text-muted-foreground text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {car.notes || <span className="text-muted-foreground/40 text-xs">—</span>}
                  </TableCell>

                  <TableCell className="text-right py-3.5 font-mono text-sm whitespace-nowrap">
                    {car.wheelbase != null
                      ? <><span className="font-semibold">{car.wheelbase}</span> <span className="text-muted-foreground text-xs">mm</span></>
                      : <span className="text-muted-foreground/40 text-xs">—</span>
                    }
                  </TableCell>

                  <TableCell>
                    <div className={cn(
                      "flex items-center gap-1 transition-opacity justify-end",
                      (!mounted || !isAdmin) ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <AddCarDialog
                        editCar={car}
                        onSuccess={onRefresh}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(car)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogTitle className="text-base font-semibold pb-1">确认删除</DialogTitle>
          <p className="text-sm text-muted-foreground py-2">
            确定要删除 <span className="font-semibold text-foreground">「{deleteTarget?.name || deleteTarget?.number}」</span> 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CAR DETAIL MODAL — pure framer-motion, no shadcn Dialog ── */}
      <AnimatePresence>
        {detailCar && (
          <>
            <motion.div
              key="detail-backdrop"
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setDetailCar(null)}
              suppressHydrationWarning
            />

            <motion.div
              key="detail-modal"
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
              suppressHydrationWarning
            >
              <motion.div
                className="relative pointer-events-auto"
                style={{ width: "min(760px, calc(100vw - 2rem))" }}
                initial={{ opacity: 0, scale: 0.92, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 8 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                suppressHydrationWarning
              >
                <div className="relative" style={{ width: "100%", height: "580px" }}>

                  <motion.div
                    className="absolute rounded-2xl bg-card border border-border/50 shadow-xl flex flex-col gap-3"
                    style={{
                      zIndex: 1,
                      bottom: "20px",
                      left: "499px",
                      width: "260px",
                      minHeight: "260px",
                      maxHeight: "540px",
                      padding: "18px",
                    }}
                    initial={{ opacity: 0, rotate: 5, x: 20 }}
                    animate={{ opacity: 1, rotate: 2, x: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22, delay: 0.02 }}
                    suppressHydrationWarning
                  >
                    <motion.button
                      onClick={() => setDetailCar(null)}
                      className="absolute flex items-center justify-center rounded-full bg-white text-foreground shadow-2xl border border-border/20"
                      style={{ width: "48px", height: "48px", top: "-68px", right: "0px" }}
                      aria-label="关闭"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      suppressHydrationWarning
                    >
                      <X className="h-6 w-6" />
                    </motion.button>

                    <div className="pb-3 border-b border-border/40">
                      <h2 className="text-[22px] font-bold leading-tight tracking-tight">
                        {detailCar.name || <span className="text-muted-foreground/60 font-normal">未命名车型</span>}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {detailCar.series && (
                          <span className="text-xs text-muted-foreground">
                            {detailCar.series.brand ? `${detailCar.series.brand.name} · ` : ""}{detailCar.series.name}
                          </span>
                        )}
                        {detailCar.number && (
                          <span className="font-mono text-[11px] text-muted-foreground/60 bg-muted/60 rounded px-1.5 py-0.5 tracking-wider">
                            {detailCar.number}
                          </span>
                        )}
                      </div>
                    </div>

                    {detailCar.wheelbase != null && (
                      <div className="flex items-baseline gap-2">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 translate-y-[1px]" />
                        <span className="text-xs text-muted-foreground/70 shrink-0">轮距</span>
                        <span className="font-mono font-semibold tabular-nums text-sm">
                          {detailCar.wheelbase}
                          <span className="font-normal text-muted-foreground text-xs ml-0.5">mm</span>
                        </span>
                      </div>
                    )}

                    {detailCar.tags && detailCar.tags.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Tag className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">标签</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {detailCar.tags.map((tag) => (
                            <span key={tag} className="text-xs font-normal rounded-full px-3 py-1 bg-primary/8 text-primary/75 border border-primary/12">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailCar.notes && (
                      <div className="flex items-start gap-2">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground/70 shrink-0 mt-0.5">备注</span>
                        <span className="text-sm text-muted-foreground leading-relaxed">{detailCar.notes}</span>
                      </div>
                    )}

                    <div className={cn(
                      "absolute bottom-3 right-3 flex items-center gap-1.5 transition-opacity",
                      (!mounted || !isAdmin) ? "opacity-0 pointer-events-none" : ""
                    )}>
                      <AddCarDialog
                        editCar={detailCar}
                        onSuccess={() => { onRefresh(); setDetailCar(null); }}
                        trigger={
                          <motion.button
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="编辑车型"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </motion.button>
                        }
                      />
                      <motion.button
                        onClick={() => { setDetailCar(null); setDeleteTarget(detailCar); }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="删除车型"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>

                  {(() => {
                    const imgs = allImages(detailCar);
                    const clampedIdx = Math.min(slideIndex, Math.max(imgs.length - 1, 0));
                    return (
                      <ImageCard
                        imgs={imgs}
                        idx={clampedIdx}
                        onPrev={() => setSlideIndex((i) => (i - 1 + imgs.length) % imgs.length)}
                        onNext={() => setSlideIndex((i) => (i + 1) % imgs.length)}
                        onDot={(i) => setSlideIndex(i)}
                        altText={detailCar.name || detailCar.number || ""}
                      />
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
