"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, Settings, HelpCircle, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface UserDropdownProps {
  userName: string;
  userEmail: string;
  isMobile?: boolean;
}

export function UserDropdown({ userName, userEmail, isMobile = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      {isMobile ? (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full bg-money-out text-white flex items-center justify-center font-bold text-sm shrink-0 transition-transform active:scale-95 uppercase"
        >
          {userName[0] || "?"}
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 pr-3 bg-muted/50 rounded-full cursor-pointer hover:bg-muted transition-colors active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-money-out text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
            {userName[0] || "?"}
          </div>
          <span className="text-sm font-medium truncate max-w-[100px]">{userName}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/[0.05] py-2 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.05] mb-2 bg-muted/20">
            <p className="text-sm font-bold truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate" title={userEmail}>{userEmail}</p>
          </div>
          
          <button 
            onClick={() => { setIsOpen(false); router.push("/settings") }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-black/5 transition-colors font-medium"
          >
            <UserIcon className="w-4 h-4" />
            Mon compte
          </button>
          
          {isMobile && (
            <>
              <button 
                onClick={() => { setIsOpen(false); router.push("/settings") }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-black/5 transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </button>

              <button 
                onClick={() => { setIsOpen(false); router.push("/support") }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-black/5 transition-colors font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                Support
              </button>
            </>
          )}
          
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors font-medium mt-1"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
