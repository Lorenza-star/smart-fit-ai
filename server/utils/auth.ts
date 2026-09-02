import { createError, getRequestHeaders } from "nitro/h3";
import type { H3Event } from "nitro/h3";
import type { User } from "@supabase/supabase-js";
import { getAdminClient } from "./supabase-admin";

/** Verify the Bearer session token and return the authenticated user. */
export async function requireUser(event: H3Event): Promise<User> {
  const authHeader = getRequestHeaders(event).authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Not signed in." });
  }
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: "Session invalid or expired." });
  }
  return data.user;
}

/** Verify the caller is the founder (is_founder on their own profile row). */
export async function requireFounder(event: H3Event): Promise<User> {
  const user = await requireUser(event);
  const { data } = await getAdminClient()
    .from("profiles")
    .select("is_founder")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.is_founder) {
    throw createError({ statusCode: 403, statusMessage: "Founder access only." });
  }
  return user;
}