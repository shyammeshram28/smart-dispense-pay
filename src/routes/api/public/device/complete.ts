import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { completeTransaction, verifyDevice } from "@/lib/atm-core";

const Body = z.object({
  transaction_id: z.string().regex(/^TX-\d{8}-\d{3,}$/),
  dispensed: z.array(z.object({ code: z.string().min(1).max(20), grams: z.number().min(0).max(50000) })).max(10),
});

// ESP32 → reports load-cell weights after dispensing; updates inventory, marks COMPLETED.
export const Route = createFileRoute("/api/public/device/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (!(await verifyDevice(supabaseAdmin, request.headers.get("x-device-id"), request.headers.get("x-device-key"))))
          return Response.json({ error: "Unauthorized device" }, { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
        const ok = await completeTransaction(supabaseAdmin, parsed.data.transaction_id, parsed.data.dispensed);
        return Response.json({ ok, status: ok ? "COMPLETED" : "REJECTED" }, { status: ok ? 200 : 409 });
      },
    },
  },
});
