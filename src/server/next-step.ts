// Shared with the closing form, so it must stay free of database imports.
export const DEFINE_NEXT_MISSION = "Definir la siguiente misión";

export function composeNextStep(criterionText: string, detail?: string) {
  const trimmed = detail?.trim();
  return trimmed ? `${criterionText} — ${trimmed}` : criterionText;
}
