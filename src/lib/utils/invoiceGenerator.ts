import jsPDF from "jspdf";
import "jspdf-autotable";

export function downloadInvoicePdf(invoice: { id: string, plan: string, amount_fcfa: number, created_at: string }, userName: string) {
  const doc = new jsPDF();

  const date = new Date(invoice.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric"
  });

  // Titre / Logo
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RÉPARTO", 14, 22);

  // Sous-titre
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("La solution ultime de répartition d'argent.", 14, 28);

  // Info Facture
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("FACTURE", 140, 22);

  doc.setFontSize(10);
  doc.text(`N° de facture : ${invoice.id.split("-")[0].toUpperCase()}`, 140, 30);
  doc.text(`Date : ${date}`, 140, 36);

  // Info Client
  doc.setFont("helvetica", "bold");
  doc.text("Facturé à :", 14, 50);
  doc.setFont("helvetica", "normal");
  doc.text(userName || "Client Réparto", 14, 56);

  // Table des articles
  const tableData = [
    [
      `Abonnement ${invoice.plan.toUpperCase()} (1 mois)`,
      "1",
      `${invoice.amount_fcfa} FCFA`,
      `${invoice.amount_fcfa} FCFA`
    ]
  ];

  (doc as any).autoTable({
    startY: 70,
    head: [["Description", "Qté", "Prix Unitaire", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    styles: { font: "helvetica", fontSize: 10 },
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY || 90;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total payé :", 140, finalY + 15);
  doc.setTextColor(37, 211, 102); // Vert
  doc.text(`${invoice.amount_fcfa} FCFA`, 170, finalY + 15);

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Merci pour votre confiance !", 105, 280, { align: "center" });

  doc.save(`Facture_Reparto_${invoice.id.split("-")[0]}.pdf`);
}
