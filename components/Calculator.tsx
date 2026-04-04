"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car, Series } from "@/lib/types";
import { Calculator as CalculatorIcon, ArrowLeftRight } from "lucide-react";

interface CalculatorProps {
  cars: Car[];
  seriesList: Series[];
}

const PRESET_WHEEL_WIDTHS = [
  { label: "标准 (9mm)", value: "9" },
  { label: "细轮 (3mm)", value: "3" },
  { label: "中等 (6mm)", value: "6" },
  { label: "宽轮 (12mm)", value: "12" },
  { label: "自定义", value: "custom" },
];

export default function Calculator({ cars, seriesList }: CalculatorProps) {
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [manualWheelbase, setManualWheelbase] = useState<string>("");
  const [wheelWidthPreset, setWheelWidthPreset] = useState<string>("9");
  const [customWheelWidth, setCustomWheelWidth] = useState<string>("");

  const selectedCar = cars.find((c) => c.id === selectedCarId);

  const wheelbase = selectedCar
    ? selectedCar.wheelbase
    : manualWheelbase
    ? parseFloat(manualWheelbase)
    : null;

  const wheelWidth =
    wheelWidthPreset === "custom"
      ? parseFloat(customWheelWidth) || null
      : parseFloat(wheelWidthPreset);

  const leftLimit =
    wheelbase !== null && wheelWidth !== null
      ? -(wheelbase / 2 - wheelWidth / 2)
      : null;
  const rightLimit =
    wheelbase !== null && wheelWidth !== null
      ? +(wheelbase / 2 - wheelWidth / 2)
      : null;

  const isValid = wheelbase !== null && wheelWidth !== null && !isNaN(wheelbase) && !isNaN(wheelWidth);

  // Group cars by series for display
  const carsBySeries = seriesList
    .map((s) => ({
      series: s,
      cars: cars.filter((c) => c.series_id === s.id),
    }))
    .filter((g) => g.cars.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalculatorIcon className="h-5 w-5 text-primary" />
            参数输入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Car selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              选择车型（自动填入轮距）
            </Label>
            <Select
              value={selectedCarId}
              onValueChange={(v) => {
                setSelectedCarId(v);
                setManualWheelbase("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择已有车型..." />
              </SelectTrigger>
              <SelectContent>
                {carsBySeries.length > 0 ? (
                  carsBySeries.map(({ series, cars: groupCars }) => (
                    <div key={series.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {series.name}
                      </div>
                      {groupCars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.number ? `${car.number} · ` : ""}
                          {car.name}
                          <span className="ml-1 text-muted-foreground">
                            ({car.wheelbase}mm)
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    暂无车型数据
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Manual wheelbase */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              或手动输入轮距
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="输入轮距 (mm)"
                value={selectedCar ? String(selectedCar.wheelbase) : manualWheelbase}
                onChange={(e) => {
                  setSelectedCarId("");
                  setManualWheelbase(e.target.value);
                }}
                readOnly={!!selectedCar}
                className={selectedCar ? "bg-muted/30" : ""}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">mm</span>
            </div>
            {selectedCar && (
              <p className="text-xs text-muted-foreground">
                已选：{selectedCar.name}
              </p>
            )}
          </div>

          {/* Wheel width */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              轮宽
            </Label>
            <Select value={wheelWidthPreset} onValueChange={setWheelWidthPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_WHEEL_WIDTHS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wheelWidthPreset === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="输入轮宽 (mm)"
                  value={customWheelWidth}
                  onChange={(e) => setCustomWheelWidth(e.target.value)}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">mm</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result Panel */}
      <Card className={isValid ? "border-primary/20 bg-primary/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            计算结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isValid ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-background border p-3">
                  <p className="text-muted-foreground text-xs mb-1">轮距</p>
                  <p className="font-semibold font-mono text-lg">{wheelbase} mm</p>
                </div>
                <div className="rounded-lg bg-background border p-3">
                  <p className="text-muted-foreground text-xs mb-1">轮宽</p>
                  <p className="font-semibold font-mono text-lg">{wheelWidth} mm</p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-background border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">左限位中心 X</p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      {leftLimit!.toFixed(2)} mm
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    左
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-background border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">右限位中心 X</p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      +{rightLimit!.toFixed(2)} mm
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    右
                  </Badge>
                </div>
              </div>

              {/* Formula */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground font-mono">
                <p className="font-semibold text-foreground text-xs mb-2">计算公式</p>
                <p>左限位 X = -(轮距/2 - 轮宽/2)</p>
                <p>= -({wheelbase}/2 - {wheelWidth}/2)</p>
                <p>= {leftLimit!.toFixed(2)} mm</p>
                <hr className="border-border my-1" />
                <p>右限位 X = +(轮距/2 - 轮宽/2)</p>
                <p>= +{rightLimit!.toFixed(2)} mm</p>
              </div>

              {/* Distance note */}
              <div className="text-center text-xs text-muted-foreground bg-background border rounded-lg p-3">
                两限位中心点间距 ={" "}
                <span className="font-semibold font-mono text-foreground">
                  {wheelbase} mm
                </span>
                （等于轮距）
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalculatorIcon className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">请输入轮距和轮宽</p>
              <p className="text-xs mt-1">选择车型或手动填写参数后自动计算</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
