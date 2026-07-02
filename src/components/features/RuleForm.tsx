"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const targetSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Label requis"),
  mode: z.enum(["percentage", "fixed"]),
  value: z.number().min(0, "Valeur positive requise"),
  momoMethod: z.string().min(1, "Méthode requise"),
  momoPhone: z.string().min(8, "Numéro invalide"),
  isRemainder: z.boolean().default(false),
});

const ruleSchema = z.object({
  name: z.string().min(3, "Nom de règle trop court"),
  triggerType: z.enum(["manual", "api", "webhook"]),
  triggerSource: z.string().min(1, "Source requise"),
  targets: z.array(targetSchema).min(1, "Au moins une cible requise"),
}).superRefine((data, ctx) => {
  const targets = data.targets;
  let totalPercentage = 0;
  let hasRemainder = false;

  for (const target of targets) {
    if (target.isRemainder) {
      if (hasRemainder) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Un seul reste autorisé", path: ["targets"] });
      }
      hasRemainder = true;
    }
    if (target.mode === "percentage" && !target.isRemainder) {
      totalPercentage += target.value;
    }
  }

  if (totalPercentage > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Total des pourcentages = ${totalPercentage}%. Doit être <= 100%`, path: ["targets"] });
  }
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface RuleFormProps {
  initialValues?: Partial<RuleFormValues>;
  onSubmit: (data: RuleFormValues) => void;
  isLoading?: boolean;
}

export function RuleForm({ initialValues, onSubmit, isLoading }: RuleFormProps) {
  const { register, control, handleSubmit, formState: { errors }, watch } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: initialValues || {
      name: "",
      triggerType: "manual",
      triggerSource: "kkiapay_1",
      targets: [
        { label: "Opérationnel", mode: "percentage", value: 40, momoMethod: "mtn_bj", momoPhone: "", isRemainder: false },
        { label: "Épargne", mode: "percentage", value: 0, momoMethod: "moov_bj", momoPhone: "", isRemainder: true },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "targets" });

  const watchTargets = watch("targets");
  const totalPercentage = watchTargets?.reduce((sum, t) => sum + (t.mode === "percentage" && !t.isRemainder ? Number(t.value || 0) : 0), 0) || 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      {/* Informations Générales */}
      <div className="bg-card/70 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-border/50 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Configuration Générale</h3>
          <p className="text-sm text-muted-foreground mt-1">Donnez un nom à votre règle et définissez son déclencheur.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nom de la règle</label>
            <Input {...register("name")} placeholder="Ex: Répartition CA Kkiapay" className="rounded-xl h-12 bg-background/50" />
            {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Déclencheur</label>
            <Controller
              control={control}
              name="triggerType"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="rounded-xl h-12 bg-background/50">
                    <SelectValue placeholder="Choisir le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="api">Automatique (API)</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Cibles de Répartition */}
      <div className="bg-card/70 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-border/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Cibles de Répartition</h3>
            <p className="text-sm text-muted-foreground mt-1">Où l&apos;argent doit-il être envoyé ? (Total actuel: {totalPercentage}%)</p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => append({ label: "", mode: "percentage", value: 10, momoMethod: "mtn_bj", momoPhone: "", isRemainder: false })}
            className="rounded-xl shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une cible
          </Button>
        </div>

        {errors.targets?.root && (
          <div className="p-4 bg-danger/10 text-danger rounded-xl flex items-center gap-3 text-sm font-medium border border-danger/20">
            <Info className="w-5 h-5 shrink-0" />
            {errors.targets.root.message}
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {fields.map((field, index) => (
              <motion.div 
                key={field.id}
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className={`p-5 rounded-2xl border transition-colors ${watchTargets[index]?.isRemainder ? "border-money-out/30 bg-money-out/5" : "border-border/50 bg-background/50"}`}
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label & Type</label>
                    <div className="flex gap-2">
                      <Input {...register(`targets.${index}.label` as const)} placeholder="Ex: Impôts" className="rounded-xl flex-1" />
                      <Controller
                        control={control}
                        name={`targets.${index}.isRemainder` as const}
                        render={({ field: { value, onChange } }) => (
                          <Button 
                            type="button" 
                            variant={value ? "default" : "outline"}
                            className={`rounded-xl px-3 ${value ? "bg-money-out text-white hover:bg-money-out/90" : ""}`}
                            onClick={() => onChange(!value)}
                          >
                            Le Reste
                          </Button>
                        )}
                      />
                    </div>
                    {errors.targets?.[index]?.label && <p className="text-danger text-xs">{errors.targets[index]?.label?.message}</p>}
                  </div>

                  {!watchTargets[index]?.isRemainder && (
                    <div className="w-[120px] space-y-2 shrink-0">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant</label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          {...register(`targets.${index}.value` as const, { valueAsNumber: true })} 
                          className="rounded-xl" 
                        />
                        <Controller
                          control={control}
                          name={`targets.${index}.mode` as const}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="w-[70px] rounded-xl px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">F</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobile Money</label>
                    <div className="flex gap-2">
                      <Controller
                        control={control}
                        name={`targets.${index}.momoMethod` as const}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="w-[110px] rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mtn_bj">MTN BJ</SelectItem>
                              <SelectItem value="moov_bj">MOOV BJ</SelectItem>
                              <SelectItem value="celtiis_bj">CELTIIS</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Input {...register(`targets.${index}.momoPhone` as const)} placeholder="Numéro" className="rounded-xl flex-1" />
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-xl text-muted-foreground hover:text-danger hover:bg-danger/10 shrink-0 mb-0.5"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="ghost" className="rounded-2xl h-12 px-6">Annuler</Button>
        <Button type="submit" disabled={isLoading} className="bg-money-out hover:bg-money-out/90 text-white rounded-2xl h-12 px-8 shadow-lg shadow-money-out/20 transition-all hover:-translate-y-1">
          {isLoading ? "Enregistrement..." : "Enregistrer la règle"}
        </Button>
      </div>
    </form>
  );
}
