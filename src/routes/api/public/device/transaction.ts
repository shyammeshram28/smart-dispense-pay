import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createTransaction, verifyDevice } from "@/lib/atm-core";

const Body = z.object({
  rfid: z.string().min(4).max(32),
  items: z.array(z.object({ code: z.string().min(1).max(20), grams: z.number().int().min(100).max(20000) })).min(1).max(10),
});

// ESP32 → creates a transaction after RFID scan. Returns the URL to encode in the QR.
export const Route = createFileRoute("/api/public/device/transaction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const deviceId = request.headers.get("x-device-id");
        if (!(await verifyDevice(supabaseAdmin, deviceId, request.headers.get("x-device-key"))))
          return Response.json({ error: "Unauthorized device" }, { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
        try {
          const tx = await createTransaction(supabaseAdmin, { ...parsed.data, deviceId: deviceId! });
          const origin = new URL(request.url).origin;
          return Response.json({ ...tx, pay_url: `${origin}/pay/${tx.transaction_id}` });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 422 });
        }
      },
    },
  },
});
