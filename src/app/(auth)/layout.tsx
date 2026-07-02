import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-money-out flex items-center justify-center">
            <span className="text-white font-bold text-2xl leading-none">R</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
