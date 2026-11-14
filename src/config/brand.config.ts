export const brand = {
  name: "StreamPad", wordmark: "STREAMPAD", monogram: "SP", ticker: "SP",
  tagline: "Ton stream. Ton token. Tes fees.",
  description: "Le launchpad des streamers Twitch et Kick : wallet créé automatiquement, 75 % des fees pour toi, claim en un clic.",
  domain: "",
  links: { x: "", discord: "", telegram: "", docs: "", pumpfun: "" }, // une valeur vide n'est jamais affichée
} as const;
export const activeLinks = Object.entries(brand.links).filter(([, u]) => u.trim() !== "");
