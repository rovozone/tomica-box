"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const ADMIN_PASSWORD = "tomica95";

interface AdminContextValue {
  isAdmin: boolean;
  unlock: (password: string) => boolean;
  lock: () => void;
  /** 密码弹窗是否打开（用于让搜索框进入 readOnly 防止浏览器自动填充） */
  passwordDialogOpen: boolean;
  setPasswordDialogOpen: (v: boolean) => void;
  /** 客户端是否已挂载（用于防止 hydration 错误） */
  mounted: boolean;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  unlock: () => false,
  lock: () => {},
  passwordDialogOpen: false,
  setPasswordDialogOpen: () => {},
  mounted: false,
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const unlock = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lock = () => setIsAdmin(false);

  return (
    <AdminContext.Provider value={{ isAdmin, unlock, lock, passwordDialogOpen, setPasswordDialogOpen, mounted }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
