"use client";

import { RuleBuilder } from "@/components/features/rules/RuleBuilder";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRegleById } from "@/app/actions/regles";

export default function EditRulePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [ruleData, setRuleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRegleById(params.id).then(({ data, error }) => {
      if (data) {
        setRuleData(data);
      } else {
        router.push('/rules');
      }
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!ruleData) return null;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/rules">
          <Button variant="outline" className="w-12 h-12 rounded-2xl p-0 hover:bg-black/5 border-black/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modifier la règle</h2>
          <p className="text-muted-foreground text-sm mt-1">Mettez à jour les paramètres de votre répartition.</p>
        </div>
      </div>

      <RuleBuilder initialData={ruleData} />
    </div>
  );
}
