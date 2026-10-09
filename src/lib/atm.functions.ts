import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as core from "./atm-core";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const txId = z.string().regex(/^TX-\d{8}-\d{3,}$/);

export const fetchPaymentTx = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: txId.parse(d.id) }))
  .handler(async ({ data }) => {
    const tx = await core.getTransaction(await admin(), data.id);
    if (!tx) return null;
    return {
      id: tx.id,
      total: Number(tx.total),
      status: tx.status,
      customer: (tx.customers as { name: string } | null)?.name ?? "",
      items: (tx.transaction_items ?? []).map((i) => ({
        name: (i.products as { name: string } | null)?.name ?? i.product_code,
        grams: i.qty_grams,
        amount: Number(i.amount),
      })),
    };
  });

export const confirmPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: txId.parse(d.id) }))
  .handler(async ({ data }) => {
    const ok = await core.confirmPayment(await admin(), data.id);
    return { ok };
  });

export const fetchDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [tx, products, customers, devices] = await Promise.all([
    db.from("transactions").select("id, total, status, created_at, customers(name), transaction_items(product_code, qty_grams, dispensed_grams)").order("created_at", { ascending: false }).limit(50),
    db.from("products").select("*").order("code"),
    db.from("customers").select("id, name, rfid_uid").order("id"),
    db.from("devices").select("id, name, last_seen"),
  ]);
  return {
    transactions: (tx.data ?? []).map((t) => ({ ...t, total: Number(t.total), customer: (t.customers as { name: string } | null)?.name ?? "" })),
    products: (products.data ?? []).map((p) => ({ ...p, price_per_kg: Number(p.price_per_kg) })),
    customers: customers.data ?? [],
    devices: devices.data ?? [],
  };
});

export const simulateTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      customerId: z.string().min(1).max(20),
      items: z.array(z.object({ code: z.string().min(1).max(20), grams: z.number().int().min(100).max(20000) })).min(1).max(10),
    }).parse(d),
  )
  .handler(async ({ data }) => core.createTransaction(await admin(), { ...data, deviceId: "ATM01" }));

export const simulateDispense = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: txId.parse(d.id) }))
  .handler(async ({ data }) => ({ ok: await core.completeTransaction(await admin(), data.id, []) }));

export const restockProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(20), grams: z.number().int().min(0).max(1000000) }).parse(d))
  .handler(async ({ data }) => {
    await (await admin()).from("products").update({ stock_grams: data.grams }).eq("code", data.code);
    return { ok: true };
  });
