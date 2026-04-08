"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Brand, Series, Car } from "@/lib/types";
import { Plus, ImagePlus, X, Loader2 } from "lucide-react";

interface AddCarDialogProps {
  defaultSeriesId?: string;
  editCar?: Car;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const NEW_ID = "__new__";
const MAX_IMAGE_SIZE = 1600; // px, max dimension for resize
const IMAGE_QUALITY = 0.88;
const MAX_IMAGES = 5;

/** 预设标签选项 */
const PRESET_TAGS = ["网络限定", "红盒", "周年纪念款"];

/** 压缩图片，返回 Blob（用于上传）和本地预览 URL */
async function compressImageToBlob(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_SIZE) / width);
            width = MAX_IMAGE_SIZE;
          } else {
            width = Math.round((width * MAX_IMAGE_SIZE) / height);
            height = MAX_IMAGE_SIZE;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
            resolve({ blob, previewUrl: URL.createObjectURL(blob) });
          },
          "image/jpeg",
          IMAGE_QUALITY
        );
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 上传单张图片到 Supabase Storage，返回公开 URL */
async function uploadImageToStorage(blob: Blob): Promise<string> {
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage
    .from("car-images")
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("car-images").getPublicUrl(fileName);
  return data.publicUrl;
}

/** 将 base64 dataURL 转为 Blob */
function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)![1];
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ── 标签多选组件 ───────────────────────────────────────────────────────────────
interface TagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** 可用选项（含预设 + 已自定义的） */
  options: string[];
  onAddOption: (tag: string) => void;
}

function TagPicker({ value, onChange, options, onAddOption }: TagPickerProps) {
  const [inputVal, setInputVal] = useState("");

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  };

  const addCustom = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (!options.includes(trimmed)) onAddOption(trimmed);
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setInputVal("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
  };

  return (
    <div className="space-y-2">
      {/* 已有选项 */}
      <div className="flex flex-wrap gap-1.5">
        {options.map((tag) => {
          const active = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {active && <span className="mr-0.5">✓</span>}
              {tag}
            </button>
          );
        })}
      </div>
      {/* 自定义新增 */}
      <div className="flex gap-2">
        <Input
          placeholder="输入自定义标签后按 Enter 添加"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={addCustom}
          disabled={!inputVal.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          添加
        </Button>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function AddCarDialog({
  defaultSeriesId,
  editCar,
  onSuccess,
  trigger,
}: AddCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // selections
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(defaultSeriesId || "");

  // inline new brand
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandNotes, setNewBrandNotes] = useState("");

  // inline new series
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesLength, setNewSeriesLength] = useState("");
  const [newSeriesWidth, setNewSeriesWidth] = useState("");
  const [newSeriesHeight, setNewSeriesHeight] = useState("");
  const [newSeriesNotes, setNewSeriesNotes] = useState("");

  // car form
  const [form, setForm] = useState({
    number: editCar?.number || "",
    name: editCar?.name || "",
    wheelbase: editCar?.wheelbase != null ? String(editCar.wheelbase) : "",
    production_year: editCar?.production_year != null ? String(editCar.production_year) : "",
    notes: editCar?.notes || "",
  });

  // tags
  const [selectedTags, setSelectedTags] = useState<string[]>(editCar?.tags || []);
  const [tagOptions, setTagOptions] = useState<string[]>(PRESET_TAGS);

  // images: 已有的存 { previewUrl: string, blob: null }，新选的存 { previewUrl: objectURL, blob: Blob }
  const [images, setImages] = useState<{ previewUrl: string; blob: Blob | null }[]>(() => {
    const urls = editCar?.image_urls?.length ? editCar.image_urls
      : editCar?.image_url ? [editCar.image_url]
      : [];
    return urls.map((url) => ({ previewUrl: url, blob: null }));
  });
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editCar;
  const isNewBrand = selectedBrandId === NEW_ID;
  const isNewSeries = selectedSeriesId === NEW_ID;

  const filteredSeries = seriesList.filter(
    (s) => !selectedBrandId || selectedBrandId === NEW_ID || s.brand_id === selectedBrandId || !s.brand_id
  );

  const fetchData = async () => {
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("brands").select("*").order("name"),
      supabase.from("series").select("*, brand:brands(*)").order("name"),
    ]);
    setBrands(b || []);
    setSeriesList(s || []);

    // if editing, pre-fill brand
    if (editCar?.series_id) {
      const found = (s || []).find((x) => x.id === editCar.series_id);
      if (found) {
        setSelectedBrandId(found.brand_id || "");
        setSelectedSeriesId(editCar.series_id);
      }
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      setSaveError(null);
      // 打开对话框时，根据 editCar 重新初始化状态
      setForm({
        number: editCar?.number || "",
        name: editCar?.name || "",
        wheelbase: editCar?.wheelbase != null ? String(editCar.wheelbase) : "",
        production_year: editCar?.production_year != null ? String(editCar.production_year) : "",
        notes: editCar?.notes || "",
      });
      setSelectedTags(editCar?.tags || []);
      const urls = editCar?.image_urls?.length ? editCar.image_urls
        : editCar?.image_url ? [editCar.image_url]
        : [];
      setImages(urls.map((url) => ({ previewUrl: url, blob: null })));
    }
    if (!open) {
      // reset on close
      if (!editCar) {
        setSelectedBrandId("");
        setSelectedSeriesId(defaultSeriesId || "");
        setForm({ number: "", name: "", wheelbase: "", production_year: "", notes: "" });
        setSelectedTags([]);
        setTagOptions(PRESET_TAGS);
        setImages([]);
      }
      setNewBrandName(""); setNewBrandNotes("");
      setNewSeriesName(""); setNewSeriesLength(""); setNewSeriesWidth(""); setNewSeriesHeight(""); setNewSeriesNotes("");
    }
  }, [open, editCar]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImageLoading(true);
    try {
      const slots = MAX_IMAGES - images.length;
      const toProcess = files.slice(0, slots);
      const results = await Promise.all(toProcess.map(compressImageToBlob));
      setImages((prev) => [...prev, ...results.map(({ blob, previewUrl }) => ({ blob, previewUrl }))]);
    } catch {
      console.error("Image compression failed");
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalSeriesId: string | null = isNewSeries ? null : (selectedSeriesId || null);
      let finalBrandId = isNewBrand ? null : (selectedBrandId || null);

      // 1. Create brand if new
      if (isNewBrand && newBrandName.trim()) {
        const { data: nb, error } = await supabase
          .from("brands")
          .insert({ name: newBrandName.trim(), notes: newBrandNotes || null })
          .select()
          .single();
        if (error) throw error;
        finalBrandId = nb.id;
      }

      // 2. Create series if new
      if (isNewSeries && newSeriesName.trim()) {
        const { data: ns, error } = await supabase
          .from("series")
          .insert({
            name: newSeriesName.trim(),
            brand_id: finalBrandId,
            box_length: parseFloat(newSeriesLength) || 0,
            box_width: parseFloat(newSeriesWidth) || 0,
            box_height: parseFloat(newSeriesHeight) || 0,
            notes: newSeriesNotes || null,
          })
          .select()
          .single();
        if (error) throw error;
        finalSeriesId = ns.id;
      }

      // 3. 上传新图片（有 blob 的）到 Storage，已有 URL 的直接复用
      const finalUrls: string[] = await Promise.all(
        images.map(async ({ previewUrl, blob }) => {
          if (blob) return uploadImageToStorage(blob);
          // 兼容旧版 base64 存储：检测到 dataURL 则先转 Blob 再上传
          if (previewUrl.startsWith("data:")) return uploadImageToStorage(dataURLToBlob(previewUrl));
          return previewUrl; // 已是 Storage 公开 URL，直接复用
        })
      );

      const carData = {
        series_id: finalSeriesId,
        number: form.number.trim() || null,
        name: form.name.trim() || null,
        wheelbase: form.wheelbase ? parseFloat(form.wheelbase) : null,
        production_year: form.production_year ? parseInt(form.production_year, 10) : null,
        notes: form.notes || null,
        image_url: finalUrls[0] || null,
        image_urls: finalUrls.length > 0 ? finalUrls : null,
        tags: selectedTags.length > 0 ? selectedTags : null,
      };

      console.log("[save] finalUrls:", finalUrls);
      console.log("[save] carData:", carData);

      // 4. Save car
      const trySave = async (data: Record<string, unknown>) => {
        if (isEditing) {
          const res = await supabase.from("cars").update(data).eq("id", editCar.id);
          console.log("[save] update result:", res);
          return res.error;
        } else {
          const res = await supabase.from("cars").insert(data);
          console.log("[save] insert result:", res);
          return res.error;
        }
      };

      let err = await trySave(carData);
      if (err) console.log("[save] first error:", err.message, err.details, err.hint);

      if (err?.message?.includes("tags")) {
        const { tags: _t, ...rest } = carData;
        err = await trySave(rest);
      }

      if (err) throw err;

      setSaveError(null);
      setOpen(false);
      onSuccess();
    } catch (err) {
      console.error("Error saving car:", err);
      setSaveError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            新增车型
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] p-0 flex flex-col rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle>{isEditing ? "编辑车型" : "新增车型"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-5 px-6 py-4 overflow-y-auto flex-1">

            {/* ── STEP 1: 品牌 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span>
                品牌
                <span className="text-muted-foreground font-normal normal-case">(可选)</span>
              </div>
              <Select
                value={selectedBrandId}
                onValueChange={(v) => {
                  setSelectedBrandId(v);
                  setSelectedSeriesId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择品牌（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none-brand">— 不指定品牌 —</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                  <SelectItem value={NEW_ID} className="text-primary font-medium">
                    <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" />新建品牌...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isNewBrand && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">填写新品牌信息</p>
                  <div className="grid gap-2">
                    <Label className="text-xs">品牌名称 *</Label>
                    <Input
                      placeholder="如：Tomica、Hot Wheels"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">备注</Label>
                    <Input
                      placeholder="可选"
                      value={newBrandNotes}
                      onChange={(e) => setNewBrandNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 2: 系列 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">2</span>
                系列
                <span className="text-muted-foreground font-normal normal-case">(可选)</span>
              </div>
              <Select
                value={selectedSeriesId}
                onValueChange={setSelectedSeriesId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择系列（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none-series">— 不指定系列 —</SelectItem>
                  {filteredSeries.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-1.5">
                        {s.brand && (
                          <span className="text-muted-foreground text-xs">{s.brand.name} ·</span>
                        )}
                        {s.name}
                        {(s.box_length || s.box_width || s.box_height) ? (
                          <span className="text-muted-foreground text-xs ml-1">
                            {s.box_length}×{s.box_width}×{s.box_height}mm
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ID} className="text-primary font-medium">
                    <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" />新建系列...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isNewSeries && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">填写新系列信息</p>
                  <div className="grid gap-2">
                    <Label className="text-xs">系列名称 *</Label>
                    <Input
                      placeholder="如：黑盒、红白盒"
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">盒长 (mm)</Label>
                      <Input type="number" step="0.1" placeholder="长" value={newSeriesLength} onChange={(e) => setNewSeriesLength(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">盒宽 (mm)</Label>
                      <Input type="number" step="0.1" placeholder="宽" value={newSeriesWidth} onChange={(e) => setNewSeriesWidth(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">盒高 (mm)</Label>
                      <Input type="number" step="0.1" placeholder="高" value={newSeriesHeight} onChange={(e) => setNewSeriesHeight(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">备注</Label>
                    <Input placeholder="可选" value={newSeriesNotes} onChange={(e) => setNewSeriesNotes(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 3: 车型 ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">3</span>
                车型信息
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="number" className="text-xs">
                    型号编号
                    <span className="ml-1 text-muted-foreground font-normal">(可选)</span>
                  </Label>
                  <Input
                    id="number"
                    placeholder="如：No.123"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wheelbase" className="text-xs">轮距 (mm)</Label>
                  <Input
                    id="wheelbase"
                    type="number"
                    step="0.1"
                    placeholder="如：28.5"
                    value={form.wheelbase}
                    onChange={(e) => setForm({ ...form, wheelbase: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="car-name" className="text-xs">车型名称</Label>
                <Input
                  id="car-name"
                  placeholder="如：Toyota Supra（可选）"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="production-year" className="text-xs">生产年份</Label>
                <Input
                  id="production-year"
                  type="number"
                  placeholder="如：2024"
                  value={form.production_year}
                  onChange={(e) => setForm({ ...form, production_year: e.target.value })}
                />
              </div>

              {/* 标签 */}
              <div className="grid gap-2">
                <Label className="text-xs">
                  标签
                  <span className="ml-1 text-muted-foreground font-normal">(可选，可多选)</span>
                </Label>
                <TagPicker
                  value={selectedTags}
                  onChange={setSelectedTags}
                  options={tagOptions}
                  onAddOption={(t) => setTagOptions((prev) => [...prev, t])}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="car-notes" className="text-xs">备注</Label>
                <Textarea
                  id="car-notes"
                  placeholder="可选备注信息"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* ── STEP 4: 图片 ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">4</span>
                图片
                <span className="text-muted-foreground font-normal normal-case">(可选，最多 {MAX_IMAGES} 张)</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {images.map(({ previewUrl }, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted/20 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`图片${idx + 1}`} className="w-full h-full object-cover" />
                    {/* 第一张标记 */}
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-primary/80 text-primary-foreground rounded px-1 py-0.5 leading-none">封面</span>
                    )}
                    {/* 删除按钮 */}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 rounded-full bg-background/80 backdrop-blur p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {/* 左移按钮（非第一张） */}
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => setImages((prev) => {
                          const next = [...prev];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          return next;
                        })}
                        className="absolute bottom-1 left-1 rounded bg-background/80 backdrop-blur p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm text-[10px] leading-none px-1"
                      >
                        ←
                      </button>
                    )}
                    {/* 右移按钮（非最后一张） */}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setImages((prev) => {
                          const next = [...prev];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          return next;
                        })}
                        className="absolute bottom-1 right-1 rounded bg-background/80 backdrop-blur p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm text-[10px] leading-none px-1"
                      >
                        →
                      </button>
                    )}
                  </div>
                ))}

                {/* 添加按钮 */}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageLoading}
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
                  >
                    {imageLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[10px]">{images.length === 0 ? "添加图片" : "继续添加"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {images.length > 0 && (
                <p className="text-[11px] text-muted-foreground/60">第一张为封面图。悬停图片可调整顺序或删除。</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

          </div>

          {/* 吸底按钮区域 */}
          <div className="border-t border-border/40 px-6 py-4 bg-card shrink-0 rounded-b-2xl">
            {saveError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-2">
                ⚠️ {saveError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : isEditing ? "保存修改" : "保存"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
