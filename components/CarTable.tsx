"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Car } from "@/lib/types";
import { Car as CarIcon } from "lucide-react";

interface CarTableProps {
  cars: Car[];
  showSeries?: boolean;
}

export default function CarTable({ cars, showSeries = false }: CarTableProps) {
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
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[100px]">型号</TableHead>
            <TableHead>车型名称</TableHead>
            {showSeries && <TableHead>所属系列</TableHead>}
            <TableHead className="text-right">轮距 (mm)</TableHead>
            <TableHead className="hidden md:table-cell">备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.map((car) => (
            <TableRow key={car.id} className="hover:bg-muted/30">
              <TableCell>
                {car.number ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    {car.number}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="font-medium">{car.name}</TableCell>
              {showSeries && (
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {car.series?.name || "—"}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-right font-mono">
                {car.wheelbase}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {car.notes || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
