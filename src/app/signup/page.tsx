"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, MailCheck, Eye, EyeOff } from "lucide-react";
import { sendWelcomeEmail } from "@/lib/email";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else if (data?.user && !data.session) {
      // Envoi de l'email de bienvenue
      await sendWelcomeEmail(email);
      setSuccess(true);
      setIsLoading(false);
    } else {
      // Auto login successful
      await sendWelcomeEmail(email);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F7] flex flex-col justify-start sm:justify-center items-center p-4 pt-16 sm:pt-4">
      <Link href="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
          R
        </div>
        <span className="text-xl font-bold tracking-tight text-black">Réparto</span>
      </Link>

      <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-black/5 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Créer un compte</h1>
          <p className="text-muted-foreground text-sm font-medium">Commencez à répartir vos revenus intelligemment.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-6 font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Vérifiez votre email</h3>
            <p className="text-muted-foreground text-sm mb-8">
              Nous vous avons envoyé un lien de confirmation. Veuillez cliquer sur ce lien pour activer votre compte avant de vous connecter.
            </p>
            <Link href="/login">
              <Button className="w-full bg-black hover:bg-black/80 text-white rounded-xl py-6 font-bold text-base">
                Aller à la page de connexion
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black" htmlFor="email">Email</label>
              <Input id="email" name="email" placeholder="octave@exemple.com" type="email" required className="rounded-xl h-14 px-4 bg-[#F5F5F7] border-transparent focus:bg-white transition-colors text-base" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <Input id="password" name="password" placeholder="••••••••" type={showPassword ? "text" : "password"} required className="rounded-xl h-14 pl-4 pr-12 bg-[#F5F5F7] border-transparent focus:bg-white transition-colors text-base" />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black p-2 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black" htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div className="relative">
                <Input id="confirmPassword" name="confirmPassword" placeholder="••••••••" type={showConfirmPassword ? "text" : "password"} required className="rounded-xl h-14 pl-4 pr-12 bg-[#F5F5F7] border-transparent focus:bg-white transition-colors text-base" />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black p-2 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 font-bold text-base mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer mon compte"}
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
