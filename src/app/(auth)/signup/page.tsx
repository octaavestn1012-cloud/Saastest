import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="p-8 rounded-3xl bg-card shadow-lg border-0">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Créer un compte</h1>
        <p className="text-sm text-muted-foreground mt-2">Commencez à automatiser vos répartitions dès aujourd&apos;hui.</p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom complet</label>
          <Input type="text" placeholder="Octave Dupont" className="h-12 rounded-xl" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="octave@exemple.com" className="h-12 rounded-xl" />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Mot de passe</label>
          <Input type="password" placeholder="••••••••" className="h-12 rounded-xl" />
        </div>

        <Button className="w-full h-12 rounded-xl bg-money-out hover:bg-money-out/90 text-white mt-6">
          S&apos;inscrire
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="text-money-out font-medium hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
