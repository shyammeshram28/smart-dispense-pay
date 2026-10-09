import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useQuery, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchDashboard, simulateTransaction, simulateDispense, restockProduct } from "@/lib/atm.functions";

const dashQuery = queryOptions({ queryKey: ["dash"], queryFn: () => fetchDashboard() });

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Smart Ration ATM" },
      { name: "description", content: "Monitor transactions, inventory and ATM devices." },
      { property: "og:title", content: "Smart Ration ATM — Admin" },
      { property: "og:description", content: "Transactions, inventory and devices dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashQuery),
  component: Admin,
});

const statusVariant = (s: string) =>
  s === "COMPLETED" ? "default" : s === "PAYMENT_SUCCESS" ? "secondary" : "outline";

function Admin() {
  const qc = useQueryClient();
  useSuspenseQuery(dashQuery);
  const fetchDash = useServerFn(fetchDashboard);
  const { data } = useQuery({ ...dashQuery, queryFn: () => fetchDash(), refetchInterval: 3000 });
  const d = data!;
  const sim = useServerFn(simulateTransaction);
  const disp = useServerFn(simulateDispense);
  const restock = useServerFn(restockProduct);

  const [customerId, setCustomerId] = useState("CUST001");
  const [qty, setQty] = useState<Record<string, string>>({ RICE: "1", SUGAR: "3" });
  const [qr, setQr] = useState<{ id: string; total: number } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["dash"] });

  const create = useMutation({
    mutationFn: () =>
      sim({
        data: {
          customerId,
          items: Object.entries(qty)
            .filter(([, v]) => Number(v) > 0)
            .map(([code, v]) => ({ code, grams: Math.round(Number(v) * 1000) })),
        },
      }),
    onSuccess: (r) => { setQr({ id: r.transaction_id, total: r.total }); refresh(); },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qrTx = qr ? d.transactions.find((t) => t.id === qr.id) : null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold tracking-tight">Smart Ration ATM <span className="text-muted-foreground">/ Admin</span></h1>
          <div className="flex gap-2 text-xs">
            {d.devices.map((dev) => {
              const online = dev.last_seen && Date.now() - new Date(dev.last_seen).getTime() < 30000;
              return <Badge key={dev.id} variant={online ? "default" : "outline"}>{dev.id} · {online ? "online" : "offline"}</Badge>;
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-1">
          <h2 className="font-semibold">ATM simulator</h2>
          <p className="mb-4 text-xs text-muted-foreground">Test the flow without hardware.</p>
          <label className="text-xs text-muted-foreground">Customer</label>
          <select className="mb-3 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {d.customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
          </select>
          {d.products.map((p) => (
            <div key={p.code} className="mb-2 flex items-center gap-2">
              <span className="w-20 text-sm">{p.name}</span>
              <Input type="number" min={0} step={0.5} value={qty[p.code] ?? ""} placeholder="0" onChange={(e) => setQty({ ...qty, [p.code]: e.target.value })} />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
          ))}
          <Button className="mt-2 w-full" onClick={() => create.mutate()} disabled={create.isPending}>Create transaction</Button>
          {create.error && <p className="mt-2 text-xs text-destructive">{(create.error as Error).message}</p>}

          {qr && (
            <div className="mt-5 rounded-lg border bg-background p-4 text-center">
              <div className="mx-auto w-fit rounded bg-card p-2"><QRCodeSVG value={`${origin}/pay/${qr.id}`} size={160} /></div>
              <p className="mt-2 text-sm font-semibold">Scan to Pay · ₹{qr.total}</p>
              <a href={`/pay/${qr.id}`} target="_blank" rel="noreferrer" className="block break-all font-mono text-xs text-primary underline">{qr.id}</a>
              <Badge className="mt-2" variant={statusVariant(qrTx?.status ?? "")}>{qrTx?.status ?? "PAYMENT_PENDING"}</Badge>
              {qrTx?.status === "PAYMENT_SUCCESS" && (
                <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={async () => { await disp({ data: { id: qr.id } }); refresh(); }}>
                  Simulate dispensing done
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Inventory</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {d.products.map((p) => (
              <div key={p.code} className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">{p.name} · ₹{p.price_per_kg}/kg · M{p.motor_channel}</p>
                <p className="text-2xl font-bold">{(p.stock_grams / 1000).toFixed(1)} kg</p>
                <button className="text-xs text-primary underline" onClick={async () => { await restock({ data: { code: p.code, grams: 50000 } }); refresh(); }}>Refill to 50 kg</button>
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-8 font-semibold">Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2">ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr>
              </thead>
              <tbody className="divide-y">
                {d.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 font-mono text-xs">{t.id}</td>
                    <td>{t.customer}</td>
                    <td className="text-xs">{t.transaction_items.map((i) => `${i.product_code} ${i.dispensed_grams ?? i.qty_grams}g`).join(", ")}</td>
                    <td>₹{t.total}</td>
                    <td><Badge variant={statusVariant(t.status)}>{t.status}</Badge></td>
                    <td className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {!d.transactions.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No transactions yet</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-8 font-semibold">Customers (RFID)</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {d.customers.map((c) => <Badge key={c.id} variant="outline">{c.id} · {c.name} · {c.rfid_uid}</Badge>)}
          </div>
        </section>
      </div>
    </main>
  );
}
