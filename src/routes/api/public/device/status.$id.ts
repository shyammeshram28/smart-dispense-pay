import { createFileRoute } from "@tanstack/react-router";
import { getTransaction, verifyDevice } from "@/lib/atm-core";

// ESP32 polls this every ~2s after showing the QR.
export const Route = createFileRoute("/api/public/device/status/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (!(await verifyDevice(supabaseAdmin, request.headers.get("x-device-id"), request.headers.get("x-device-key"))))
          return Response.json({ error: "Unauthorized device" }, { status: 401 });
        const tx = await getTransaction(supabaseAdmin, params.id);
        if (!tx) return Response.json({ error: "Not found" }, { status: 404 });
        const paid = tx.status === "PAYMENT_SUCCESS";
        return Response.json({
          transaction_id: tx.id,
          payment_status: paid ? "SUCCESS" : tx.status === "COMPLETED" ? "COMPLETED" : "PENDING",
          dispense: paid,
          items: paid
            ? (tx.transaction_items ?? []).map((i) => ({
                code: i.product_code,
                grams: i.qty_grams,
                channel: (i.products as { motor_channel: number } | null)?.motor_channel ?? 1,
              }))
            : [],
        });
      },
    },
  },
});
