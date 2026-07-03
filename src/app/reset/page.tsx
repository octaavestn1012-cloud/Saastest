"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset/update`,
    });

    if (error) {
      setError("Impossible d'envoyer l'email. Vérifiez l'adresse.");
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
          R
        </div>
        <span className="text-xl font-bold tracking-tight text-black">Réparto</span>
      </Link>

      <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-black/5 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Mot de passe oublié</h1>
          <p className="text-muted-foreground text-sm font-medium">Entrez votre email pour recevoir un lien de réinitialisation.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Email envoyé !</h3>
            <p className="text-muted-foreground text-sm mb-8">
              Vérifiez votre boîte de réception et cliquez sur le lien pour choisir un nouveau mot de passe.
            </p>
            <Link href="/login">
              <Button className="w-full bg-black hover:bg-black/80 text-white rounded-xl py-6 font-bold text-base">
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black" htmlFor="email">Email</label>
              <Input id="email" name="email" placeholder="octave@exemple.com" type="email" required className="rounded-xl" />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 font-bold text-base" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le lien"}
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
            <Link href="/login" className="text-black font-bold hover:underline">
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
