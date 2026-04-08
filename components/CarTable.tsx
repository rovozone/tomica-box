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

/** 给 Supabase Storage URL 添加缩图参数，非 Supabase URL 原样返回
 *  Supabase Image Transformation 需要把路径从
 *  /storage/v1/object/public/  替换成  /storage/v1/render/image/public/
 *  使用 resize=contain 保持原始宽高比，不裁切图片内容
 */
function withResize(url: string, width: number, quality = 80): string {
  if (!url.includes("supabase.co/storage")) return url;
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/** 取第一张可用图片 URL（缩略图，用于列表/卡片展示） */
function firstImage(car: Car, thumbWidth = 600): string | null {
  const url = car.image_urls?.length ? car.image_urls[0] : (car.image_url || null);
  return url ? withResize(url, thumbWidth) : null;
}

/** 取所有图片 URL 列表（原图，用于详情弹窗） */
function allImages(car: Car): string[] {
  if (car.image_urls?.length) return car.image_urls;
  if (car.image_url) return [car.image_url];
  return [];
}

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const VELOCITY_THRESHOLD = 500;

/** 图片卡片：framer-motion drag + spring，支持触控板/触摸/鼠标
 *  thumbImgs: 与 imgs 对应的缩略图 URL（可选），用于先行占位展示 */
function ImageCard({
  imgs, thumbImgs, idx, onPrev, onNext, onDot, altText,
}: {
  imgs: string[];
  thumbImgs?: string[];
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  altText: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  // 记录每张图是否已完成高清加载（key = 原图 URL）
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    x.set(0);
  }, [idx, x]);

  // 切换到新 idx 时，预先用 Image() 探测原图是否已缓存/加载完毕
  useEffect(() => {
    const src = imgs[idx];
    if (!src || loaded[src]) return;
    const img = new Image();
    img.onload = () => setLoaded((prev) => ({ ...prev, [src]: true }));
    img.src = src;
  }, [idx, imgs]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {/* 缩略图占位层：在原图未加载完成时显示 */}
            {thumbImgs?.[idx] && !loaded[imgs[idx]] && (
              <img
                key={`thumb-${thumbImgs[idx]}`}
                src={thumbImgs[idx]}
                alt={altText}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            )}
            {/* 原图层：加载完成后淡入覆盖缩略图 */}
            <img
              key={imgs[idx]}
              src={imgs[idx]}
              alt={altText}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loaded[imgs[idx]] ? 1 : 0 }}
              draggable={false}
              onLoad={() => setLoaded((prev) => ({ ...prev, [imgs[idx]]: true }))}
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

/** 移动端图片轮播组件：全尺寸填充，支持左右滑动切换 */
function MobileImageSlider({
  imgs, thumbImgs, idx, onPrev, onNext, onDot, altText,
}: {
  imgs: string[];
  thumbImgs?: string[];
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
  altText: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    animate(x, 0, { duration: 0 });
  }, [idx, x]);

  useEffect(() => {
    const src = imgs[idx];
    if (!src || loaded[src]) return;
    const img = new Image();
    img.onload = () => setLoaded((prev) => ({ ...prev, [src]: true }));
    img.src = src;
  }, [idx, imgs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const W = containerRef.current?.offsetWidth ?? 300;
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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden select-none bg-muted/10">
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
          {/* 缩略图占位层 */}
          {thumbImgs?.[idx] && !loaded[imgs[idx]] && (
            <img
              key={`thumb-${thumbImgs[idx]}`}
              src={thumbImgs[idx]}
              alt={altText}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}
          {/* 原图层：加载完成后淡入 */}
          <img
            key={imgs[idx]}
            src={imgs[idx]}
            alt={altText}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: loaded[imgs[idx]] ? 1 : 0 }}
            draggable={false}
            onLoad={() => setLoaded((prev) => ({ ...prev, [imgs[idx]]: true }))}
          />
        </motion.div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground/20">
          <ImageOff className="h-10 w-10" />
        </div>
      )}

      {imgs.length > 1 && (
        <>
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
        className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 touch-pan-y"
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
              whileTap={{ scale: 0.95, transition: { type: "spring", stiffness: 500, damping: 30 } }}
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
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
                    {firstImage(car, 120) ? (
                      <motion.button
                        onClick={() => { setDetailCar(car); setSlideIndex(0); }}
                        className="block w-14 h-14 rounded-xl overflow-hidden border border-border/60 bg-muted/20 shrink-0 shadow-sm"
                        whileHover={{ scale: 1.08, boxShadow: "0 0 0 2px hsl(var(--primary)/0.4)", transition: { type: "spring", stiffness: 400, damping: 25 } }}
                        whileTap={{ scale: 0.95 }}
                        suppressHydrationWarning
                      >
                        <img
                          src={firstImage(car, 120)!}
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
                      {/* 删除（次要·左）编辑（主要·右） */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/8"
                        onClick={() => setDeleteTarget(car)}
                        title="删除车型"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <AddCarDialog
                        editCar={car}
                        onSuccess={onRefresh}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" title="编辑车型">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
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
        <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden gap-0">
          {/* 危险操作警示区 */}
          <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-5 bg-destructive/5 border-b border-destructive/10">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-base font-semibold text-foreground">删除车型</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                即将删除
                <span className="font-semibold text-foreground mx-1">「{deleteTarget?.name || deleteTarget?.number}」</span>
                此操作<span className="text-destructive font-medium">无法撤销</span>。
              </p>
            </div>
          </div>
          {/* 操作区：取消（次要·左）确认删除（主要·右） */}
          <div className="flex gap-2 px-5 py-4">
            <Button
              variant="outline"
              className="flex-1 h-10"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-[2] h-10 font-semibold"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
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

            {/* ── 移动端：底部 Sheet 样式（上图下文）── */}
            {/* 移动端蒙层点击关闭（独立覆盖在 backdrop 上） */}
            <div
              className="sm:hidden fixed inset-0 z-[49]"
              onClick={() => setDetailCar(null)}
            />

            <motion.div
              key="detail-modal-mobile"
              className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col pointer-events-none"
              suppressHydrationWarning
            >
              <motion.div
                className="pointer-events-auto bg-card rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "92dvh" }}
                onClick={(e) => e.stopPropagation()}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.35 }}
                dragMomentum={false}
                onDragEnd={(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
                  if (info.offset.y > 72 || info.velocity.y > 350) setDetailCar(null);
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                suppressHydrationWarning
              >
                {/* 顶部栏：纯拖拽指示条 */}
                <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
                  <div className="w-9 h-1 rounded-full bg-border/60" />
                </div>

                {/* 图片区域 */}
                {(() => {
                  const imgs = allImages(detailCar);
                  const thumbImgs = imgs.map((url) => withResize(url, 600));
                  const clampedIdx = Math.min(slideIndex, Math.max(imgs.length - 1, 0));
                  return (
                    <div className="relative mx-4 mt-2 mb-3 rounded-2xl overflow-hidden shrink-0" style={{ aspectRatio: "4/3" }}>
                      <MobileImageSlider
                        imgs={imgs}
                        thumbImgs={thumbImgs}
                        idx={clampedIdx}
                        onPrev={() => setSlideIndex((i) => (i - 1 + imgs.length) % imgs.length)}
                        onNext={() => setSlideIndex((i) => (i + 1) % imgs.length)}
                        onDot={(i) => setSlideIndex(i)}
                        altText={detailCar.name || detailCar.number || ""}
                      />
                    </div>
                  );
                })()}

                {/* 信息区域（可滚动） */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-4 min-h-0 pb-4">
                  {/* 标题行：全宽展示，无右侧挤压 */}
                  <div>
                    <h2 className="text-xl font-bold leading-snug tracking-tight">
                      {detailCar.name || <span className="text-muted-foreground/60 font-normal">未命名车型</span>}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                  {/* 分隔线 */}
                  <div className="border-t border-border/40" />

                  {/* 属性行 */}
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
                </div>

                {/* 底部操作区：仅 Admin 可见 */}
                {/* 删除（次要·左·小）编辑（主要·右·大） */}
                {mounted && isAdmin && (
                  <div className="shrink-0 px-4 pt-3 pb-6 border-t border-border/40 flex items-center gap-2">
                    {/* 删除：幽灵轮廓，宽度收窄，视觉降权 */}
                    <motion.button
                      onClick={() => { setDetailCar(null); setDeleteTarget(detailCar); }}
                      className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-border/60 bg-transparent text-muted-foreground text-sm"
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{ touchAction: "manipulation" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </motion.button>
                    {/* 编辑：实心主色，flex-1 撑满剩余，视觉强化 */}
                    <AddCarDialog
                      editCar={detailCar}
                      onSuccess={() => { onRefresh(); setDetailCar(null); }}
                      trigger={
                        <motion.button
                          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm"
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          style={{ touchAction: "manipulation" }}
                        >
                          <Pencil className="h-4 w-4" />
                          编辑车型
                        </motion.button>
                      }
                    />
                  </div>
                )}
                {/* 非 Admin 时底部留白，适配 iOS 安全区 */}
                {(!mounted || !isAdmin) && (
                  <div className="shrink-0 pb-6" />
                )}
              </motion.div>
            </motion.div>

            {/* ── 桌面端：双卡片斜置样式（保持原有逻辑）── */}
            <motion.div
              key="detail-modal"
              className="hidden sm:flex fixed inset-0 z-50 items-center justify-center"
              onClick={() => setDetailCar(null)}
              suppressHydrationWarning
            >
              <motion.div
                className="relative pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
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
                      {/* 删除（次要·左）编辑（主要·右） */}
                      <motion.button
                        onClick={() => { setDetailCar(null); setDeleteTarget(detailCar); }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/40 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="删除车型"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </motion.button>
                      <AddCarDialog
                        editCar={detailCar}
                        onSuccess={() => { onRefresh(); setDetailCar(null); }}
                        trigger={
                          <motion.button
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-sm"
                            title="编辑车型"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </motion.button>
                        }
                      />
                    </div>
                  </motion.div>

                  {(() => {
                    const imgs = allImages(detailCar);
                    const thumbImgs = imgs.map((url) => withResize(url, 600));
                    const clampedIdx = Math.min(slideIndex, Math.max(imgs.length - 1, 0));
                    return (
                      <ImageCard
                        imgs={imgs}
                        thumbImgs={thumbImgs}
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
