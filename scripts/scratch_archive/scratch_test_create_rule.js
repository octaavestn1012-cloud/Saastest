require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Simuler la logique de saveRegle
async function saveRegleSimulation(userId, payload) {
  const { id, nom, actif, declencheur } = payload;
  let regleId = id;
  let finalActif = actif ?? true;

  if (finalActif && declencheur === "a_chaque_entree") {
    // Vérifier s'il y a déjà une autre règle "a_chaque_entree" active
    const { data: activeAutoRules, error: checkError } = await supabase
      .from("regles")
      .select("id")
      .eq("user_id", userId)
      .eq("declencheur", "a_chaque_entree")
      .eq("actif", true)
      .neq("id", regleId || "");

    if (checkError) {
      console.error("Check Error:", checkError);
    }

    console.log("Check found active rules count:", activeAutoRules ? activeAutoRules.length : 0);

    if (activeAutoRules && activeAutoRules.length > 0) {
      finalActif = false;
    }
  }

  console.log("Saving rule with actif =", finalActif);
  
  const regleData = {
    user_id: userId,
    nom,
    actif: finalActif,
    declencheur,
    mode: "pourcentage"
  };

  const { data, error } = await supabase.from("regles").insert(regleData).select().single();
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Successfully created rule in DB:", data);
    // Nettoyer après le test
    await supabase.from("regles").delete().eq("id", data.id);
    console.log("Deleted test rule from DB.");
  }
}

async function run() {
  const userId = "dc14e556-87d1-4074-99c0-d854ab0bff68"; // Marc Soetonve user_id
  const payload = {
    nom: "Test Auto Pause Rule",
    actif: true,
    declencheur: "a_chaque_entree"
  };
  await saveRegleSimulation(userId, payload);
}
run();
