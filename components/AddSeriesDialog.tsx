"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Brand } from "@/lib/types";
import { Plus } from "lucide-react";
import AddBrandDialog from "@/components/AddBrandDialog";

interface AddSeriesDialogProps {
  brands: Brand[];
  onSuccess: () => void;
  onBrandAdded: () => void;
}

export default function AddSeriesDialog({ brands, onSuccess, onBrandAdded }: AddSeriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brand_id: "",
    box_length: "",
    box_width: "",
    box_height: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.box_length || !form.box_width || !form.box_height) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("series").insert({
        name: form.name,
        brand_id: form.brand_id || null,
        box_length: parseFloat(form.box_length),
        box_width: parseFloat(form.box_width),
        box_height: parseFloat(form.box_height),
        notes: form.notes || null,
      });
      if (error) throw error;
      setForm({ name: "", brand_id: "", box_length: "", box_width: "", box_height: "", notes: "" });
      setOpen(false);
      onSuccess();
    } catch (err) {
      console.error("Error adding series:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          新增系列
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>新增系列</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 品牌选择 */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>品牌</Label>
                <AddBrandDialog
                  onSuccess={onBrandAdded}
                  trigger={
                    <button type="button" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      <Plus className="h-3 w-3" />新增品牌
                    </button>
                  }
                />
              </div>
              <Select
                value={form.brand_id}
                onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择品牌（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— 不指定品牌 —</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 系列名称 */}
            <div className="grid gap-2">
              <Label htmlFor="name">系列名称 *</Label>
              <Input
                id="name"
                placeholder="如：黑盒、红白盒-短厚"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* 盒子尺寸 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="box_length">盒长 (mm) *</Label>
                <Input
                  id="box_length"
                  type="number"
                  step="0.1"
                  placeholder="长"
                  value={form.box_length}
                  onChange={(e) => setForm({ ...form, box_length: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="box_width">盒宽 (mm) *</Label>
                <Input
                  id="box_width"
                  type="number"
                  step="0.1"
                  placeholder="宽"
                  value={form.box_width}
                  onChange={(e) => setForm({ ...form, box_width: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="box_height">盒高 (mm) *</Label>
                <Input
                  id="box_height"
                  type="number"
                  step="0.1"
                  placeholder="高"
                  value={form.box_height}
                  onChange={(e) => setForm({ ...form, box_height: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="可选备注信息"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
