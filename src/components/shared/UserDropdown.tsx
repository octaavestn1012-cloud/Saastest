"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface UserDropdownProps {
  userName: string;
  isMobile?: boolean;
}

export function UserDropdown({ userName, isMobile = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      {isMobile ? (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full bg-money-out text-white flex items-center justify-center font-bold text-sm shrink-0 transition-transform active:scale-95"
        >
          {userName[0]}
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 pr-3 bg-muted/50 rounded-full cursor-pointer hover:bg-muted transition-colors active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-money-out text-white flex items-center justify-center font-bold text-sm shrink-0">
            {userName[0]}
          </div>
          <span className="text-sm font-medium">{userName}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/[0.05] py-2 z-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-black/[0.05] mb-2">
            <p className="text-sm font-bold truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userName.toLowerCase()}@example.com</p>
          </div>
          
          <Link 
            href="/login" 
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-black/5 transition-colors font-medium"
          >
            <UserIcon className="w-4 h-4" />
            Se connecter
          </Link>
          <Link 
            href="/login" 
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Link>
        </div>
      )}
    </div>
  );
}
