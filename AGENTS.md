<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- ATM business logic lives in src/lib/atm-core.ts and takes the DB client as a parameter; ESP32 talks only to /api/public/device/* authenticated by x-device-id/x-device-key headers — keeps hardware and web paths sharing one state machine.
- Payment status only advances PAYMENT_PENDING -> PAYMENT_SUCCESS -> COMPLETED via conditional updates — guarantees a QR can never pay or dispense twice.
