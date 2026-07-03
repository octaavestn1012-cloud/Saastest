"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
          R
        </div>
        <span className="text-xl font-bold tracking-tight text-black">Réparto</span>
      </Link>

      <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-black/5 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Créer un compte</h1>
          <p className="text-muted-foreground text-sm font-medium">Commencez à répartir vos revenus intelligemment.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-black" htmlFor="email">Email</label>
            <Input id="email" name="email" placeholder="octave@exemple.com" type="email" required className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-black" htmlFor="password">Mot de passe</label>
            <Input id="password" name="password" placeholder="••••••••" type="password" required className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-black" htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <Input id="confirmPassword" name="confirmPassword" placeholder="••••••••" type="password" required className="rounded-xl" />
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 font-bold text-base" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer mon compte"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
