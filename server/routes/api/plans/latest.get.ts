import { defineHandler } from "nitro";
import { getAdminClient } from "../../../utils/supabase-admin";
import { requireUser } from "../../../utils/auth";

export default defineHandler(async (event) => {
  const user = await requireUser(event);
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("weekly_plans")
    .select("id, status, error_code, plan_json")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { plan: null, error: error.message };
  }

  return { plan: data ?? null };
});
