import { Badge } from "@/components/ui/badge";

type StatusType = "succeeded" | "completed" | "failed" | "partially_failed" | "pending" | "processing" | "canceled" | "draft" | "awaiting_confirmation" | "active" | "paused";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let label: string = status;
  let colorClasses = "bg-muted text-muted-foreground";

  switch (status) {
    case "succeeded":
    case "completed":
    case "active":
      label = status === "succeeded" ? "Succès" : status === "completed" ? "Terminé" : "Actif";
      colorClasses = "bg-money-in/10 text-money-in";
      break;
    case "failed":
    case "canceled":
      label = status === "failed" ? "Échoué" : "Annulé";
      colorClasses = "bg-danger/10 text-danger";
      break;
    case "partially_failed":
      label = "Échec partiel";
      colorClasses = "bg-danger/10 text-danger";
      break;
    case "paused":
      label = "En pause";
      colorClasses = "bg-muted text-muted-foreground";
      break;
    case "pending":
    case "processing":
    case "awaiting_confirmation":
    case "draft":
      label = status === "pending" ? "En attente" : status === "processing" ? "En cours" : status === "awaiting_confirmation" ? "À confirmer" : "Brouillon";
      colorClasses = "bg-muted text-muted-foreground";
      break;
  }

  return (
    <Badge variant="outline" className={`border-0 rounded-full ${colorClasses} ${className}`}>
      {label}
    </Badge>
  );
}
