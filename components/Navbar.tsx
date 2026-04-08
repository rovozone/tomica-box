"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Lock, LockOpen, Eye } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin-context";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const navItems = [
  { href: "/cars", label: "车型库", icon: LayoutGrid },
];

function MiniScaleLogo() {
  return (
    <span
      className="text-[22px] leading-none tracking-tight select-none transition-opacity group-hover:opacity-85"
      style={{ fontFamily: "var(--font-archivo-black), sans-serif" }}
    >
      <span className="text-foreground">Mini</span>
      <span className="text-primary">Scale</span>
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, unlock, lock, setPasswordDialogOpen, mounted } = useAdmin();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = () => {
    const ok = unlock(password);
    if (ok) {
      setDialogOpen(false);
      setPassword("");
      setError("");
      router.push("/cars");
    } else {
      setError("密码错误，请重试");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    setPasswordDialogOpen(open);
    if (!open) {
      setPassword("");
      setError("");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/cars" className="flex items-center group">
              <MiniScaleLogo />
            </Link>

            <div className="flex items-center gap-1.5">
              {/* Nav links — M3 style: underline indicator */}
              <div className="flex items-center">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors rounded-xl select-none",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Admin chip - always rendered, use opacity to hide */}
              <button
                onClick={lock}
                title="退出管理模式"
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all bg-amber-500/12 text-amber-700 hover:bg-amber-500/20 border border-amber-500/20",
                  (!mounted || !isAdmin) && "opacity-0 pointer-events-none"
                )}
              >
                <LockOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">管理中</span>
              </button>
              <button
                onClick={() => { setDialogOpen(true); setPasswordDialogOpen(true); }}
                title="进入管理模式"
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border",
                  (!mounted || isAdmin) && "opacity-0 pointer-events-none"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">仅浏览</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Password Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              进入管理模式
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-muted-foreground">请输入管理密码以解锁编辑功能。</p>
            <div className="grid gap-2">
              <Label className="text-xs">管理密码</Label>
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                autoComplete="off"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>取消</Button>
            <Button onClick={handleUnlock} disabled={!password}>
              <LockOpen className="h-4 w-4" />
              解锁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
