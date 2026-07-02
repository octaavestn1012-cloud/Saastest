import Link from "next/link";
import { Plus } from "lucide-react";

export function RepartirFab() {
  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-50">
      <Link
        href="/repartir"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-money-out text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
