import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Ration ATM — RFID + QR Dispensing" },
      { name: "description", content: "Smart Ration ATM: RFID identification, QR payment and automatic ration dispensing with ESP32." },
      { property: "og:title", content: "Smart Ration ATM" },
      { property: "og:description", content: "RFID identification, QR payment and automatic ration dispensing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const steps = ["RFID scan", "Transaction created", "QR on OLED", "Customer confirms on phone", "Backend marks SUCCESS", "ESP32 dispenses", "Weight verified · COMPLETED"];

function Index() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold tracking-[0.3em] text-primary">SMART RATION ATM</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Scan card. Scan QR. Collect ration.</h1>
        <p className="mt-4 text-lg text-muted-foreground">QR code only opens the payment page — payment is confirmed by the backend, and each transaction dispenses exactly once.</p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg"><Link to="/admin">Open admin panel</Link></Button>
        </div>
        <ol className="mt-12 grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <span className="text-sm font-medium">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
