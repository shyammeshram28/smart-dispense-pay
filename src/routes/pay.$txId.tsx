import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPaymentTx, confirmPaymentFn } from "@/lib/atm.functions";

const txQuery = (id: string) =>
  queryOptions({ queryKey: ["pay", id], queryFn: () => fetchPaymentTx({ data: { id } }) });

export const Route = createFileRoute("/pay/$txId")({
  head: ({ params }) => ({
    meta: [
      { title: `Pay ${params.txId} — Smart Ration` },
      { name: "description", content: "Confirm your Smart Ration ATM payment." },
      { property: "og:title", content: "Smart Ration Payment" },
      { property: "og:description", content: "Confirm your ration payment to start dispensing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(txQuery(params.txId)).catch(() => null),
  component: PayPage,
  errorComponent: () => <Shell><p className="text-center text-muted-foreground">Invalid payment link.</p></Shell>,
});

const fmtQty = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-sm">
        <p className="mb-6 text-center text-sm font-bold tracking-[0.3em] text-primary">SMART RATION</p>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}

function PayPage() {
  const { txId } = Route.useParams();
  const qc = useQueryClient();
  const { data: tx } = useSuspenseQuery(txQuery(txId));
  const confirm = useServerFn(confirmPaymentFn);
  const fetchTx = useServerFn(fetchPaymentTx);
  // After paying, keep polling so the customer sees "Completed" once the ATM finishes.
  useQuery({
    queryKey: ["pay", txId],
    queryFn: () => fetchTx({ data: { id: txId } }),
    initialData: tx,
    refetchInterval: (q) => (q.state.data?.status === "PAYMENT_SUCCESS" ? 2500 : false),
  });
  const m = useMutation({
    mutationFn: () => confirm({ data: { id: txId } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["pay", txId] }),
  });

  if (!tx) return <Shell><div className="text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="font-semibold">Transaction not found</p></div></Shell>;

  if (tx.status === "COMPLETED")
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-primary" />
          <h1 className="text-xl font-bold">Transaction Already Completed</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{tx.id}</p>
          <p className="mt-4 text-sm text-muted-foreground">This ration has been dispensed. It cannot be dispensed again.</p>
        </div>
      </Shell>
    );

  if (tx.status === "PAYMENT_SUCCESS")
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" />
          <h1 className="text-xl font-bold">Payment Successful</h1>
          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Transaction ID</p>
          <p className="font-mono font-semibold">{tx.id}</p>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Please wait… your ration is being dispensed.
          </p>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Customer</p>
      <p className="text-lg font-semibold">{tx.customer}</p>
      <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">Items</p>
      <ul className="mt-1 divide-y">
        {tx.items.map((i) => (
          <li key={i.name} className="flex justify-between py-2 text-sm">
            <span>{i.name} <span className="text-muted-foreground">· {fmtQty(i.grams)}</span></span>
            <span className="font-medium">₹{i.amount}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-end justify-between border-t pt-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
        <span className="text-3xl font-bold">₹{tx.total}</span>
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{tx.id}</p>
      <Button className="mt-6 h-12 w-full text-base" disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRM PAYMENT"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Demo payment — no real money is charged.</p>
    </Shell>
  );
}
