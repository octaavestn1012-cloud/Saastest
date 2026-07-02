import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="p-8 rounded-3xl bg-card shadow-lg border-0">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Bon retour !</h1>
        <p className="text-sm text-muted-foreground mt-2">Connectez-vous pour gérer vos répartitions.</p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="octave@exemple.com" className="h-12 rounded-xl" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Mot de passe</label>
            <Link href="#" className="text-xs text-money-out hover:underline">Oublié ?</Link>
          </div>
          <Input type="password" placeholder="••••••••" className="h-12 rounded-xl" />
        </div>

        <Button className="w-full h-12 rounded-xl bg-money-out hover:bg-money-out/90 text-white mt-6">
          Se connecter
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-money-out font-medium hover:underline">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
