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
import { Series } from "@/lib/types";
import { Plus } from "lucide-react";

interface AddCarDialogProps {
  seriesList: Series[];
  defaultSeriesId?: string;
  onSuccess: () => void;
}

export default function AddCarDialog({
  seriesList,
  defaultSeriesId,
  onSuccess,
}: AddCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    series_id: defaultSeriesId || "",
    number: "",
    name: "",
    wheelbase: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.series_id || !form.name || !form.wheelbase) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("cars").insert({
        series_id: form.series_id,
        number: form.number || null,
        name: form.name,
        wheelbase: parseFloat(form.wheelbase),
        notes: form.notes || null,
      });
      if (error) throw error;
      setForm({
        series_id: defaultSeriesId || "",
        number: "",
        name: "",
        wheelbase: "",
        notes: "",
      });
      setOpen(false);
      onSuccess();
    } catch (err) {
      console.error("Error adding car:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          新增车型
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>新增车型</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!defaultSeriesId && (
              <div className="grid gap-2">
                <Label>所属系列 *</Label>
                <Select
                  value={form.series_id}
                  onValueChange={(v) => setForm({ ...form, series_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择系列" />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="number">型号编号</Label>
                <Input
                  id="number"
                  placeholder="如：No.123"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wheelbase">轮距 (mm) *</Label>
                <Input
                  id="wheelbase"
                  type="number"
                  step="0.1"
                  placeholder="如：28.5"
                  value={form.wheelbase}
                  onChange={(e) =>
                    setForm({ ...form, wheelbase: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="car-name">车型名称 *</Label>
              <Input
                id="car-name"
                placeholder="如：Toyota Supra"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="car-notes">备注</Label>
              <Textarea
                id="car-notes"
                placeholder="可选备注信息"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
