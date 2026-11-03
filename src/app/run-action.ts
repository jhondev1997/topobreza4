import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ActionForm";
import { DomainError } from "@/server/errors";

// Shared by the server actions: a broken domain rule goes back to the form.
export async function runAction(change: () => Promise<unknown>): Promise<ActionState> {
  try {
    await change();
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  return {};
}
