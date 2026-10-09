// Shared Smart Ration ATM business logic. Every function takes the privileged
// client as a parameter so this module never imports it at module scope.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type TxStatus = "PAYMENT_PENDING" | "PAYMENT_SUCCESS" | "DISPENSING" | "COMPLETED" | "CANCELLED";

export function itemAmount(pricePerKg: number, grams: number) {
  return Math.round(pricePerKg * (grams / 1000));
}

export async function verifyDevice(db: DB, deviceId: string | null, key: string | null) {
  if (!deviceId || !key) return false;
  const { data } = await db.from("devices").select("id, api_key").eq("id", deviceId).maybeSingle();
  if (!data || data.api_key !== key) return false;
  await db.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", deviceId);
  return true;
}

export async function createTransaction(
  db: DB,
  input: { rfid?: string; customerId?: string; deviceId?: string; items: { code: string; grams: number }[] },
) {
  let q = db.from("customers").select("id, name");
  q = input.rfid ? q.eq("rfid_uid", input.rfid.toUpperCase()) : q.eq("id", input.customerId ?? "");
  const { data: customer } = await q.maybeSingle();
  if (!customer) throw new Error("Customer not found");
  if (!input.items.length) throw new Error("No items");

  const codes = input.items.map((i) => i.code.toUpperCase());
  const { data: products } = await db.from("products").select("*").in("code", codes);
  const lines = input.items.map((i) => {
    const p = products?.find((x) => x.code === i.code.toUpperCase());
    if (!p) throw new Error(`Unknown product ${i.code}`);
    if (p.stock_grams < i.grams) throw new Error(`Not enough ${p.name} in stock`);
    return { product_code: p.code, qty_grams: i.grams, amount: itemAmount(Number(p.price_per_kg), i.grams) };
  });
  const total = lines.reduce((s, l) => s + l.amount, 0);

  const { data: id, error: idErr } = await db.rpc("next_tx_id");
  if (idErr || !id) throw new Error("Could not create transaction ID");
  const { error } = await db.from("transactions").insert({
    id, customer_id: customer.id, device_id: input.deviceId ?? null, total, status: "PAYMENT_PENDING",
  });
  if (error) throw new Error(error.message);
  await db.from("transaction_items").insert(lines.map((l) => ({ ...l, transaction_id: id })));
  return { transaction_id: id as string, customer: customer.name, total };
}

export async function getTransaction(db: DB, id: string) {
  const { data } = await db
    .from("transactions")
    .select("id, total, status, created_at, paid_at, completed_at, customer_id, customers(name), transaction_items(product_code, qty_grams, dispensed_grams, amount, products(name, motor_channel))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Only PAYMENT_PENDING can move to PAYMENT_SUCCESS — scanning again never re-pays. */
export async function confirmPayment(db: DB, id: string) {
  const { data } = await db
    .from("transactions")
    .update({ status: "PAYMENT_SUCCESS", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "PAYMENT_PENDING")
    .select("id")
    .maybeSingle();
  return !!data;
}

/** Device reports dispensing finished: record weights, deduct stock, mark COMPLETED (once). */
export async function completeTransaction(db: DB, id: string, dispensed: { code: string; grams: number }[]) {
  const { data: tx } = await db
    .from("transactions")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["PAYMENT_SUCCESS", "DISPENSING"])
    .select("id")
    .maybeSingle();
  if (!tx) return false;
  const { data: items } = await db.from("transaction_items").select("id, product_code, qty_grams").eq("transaction_id", id);
  for (const it of items ?? []) {
    const reported = dispensed.find((d) => d.code.toUpperCase() === it.product_code);
    const grams = reported ? Math.max(0, Math.round(reported.grams)) : it.qty_grams;
    await db.from("transaction_items").update({ dispensed_grams: grams }).eq("id", it.id);
    const { data: p } = await db.from("products").select("stock_grams").eq("code", it.product_code).single();
    if (p) await db.from("products").update({ stock_grams: Math.max(0, p.stock_grams - grams) }).eq("code", it.product_code);
  }
  return true;
}
