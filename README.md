# Smart Dispense Pay

i want Web Application & Admin Pane + The Hardware Firmware (ESP32 Arduino/C++) Haan. Tumhare project mein real UPI/payment gateway ki zarurat nahi hai. Tum ek dummy payment web page bana sakte ho jise customer mobile se QR scan karke open karega.
Exact flow
Smart ATM
   │
   │ Transaction created
   ▼
Backend
   │
   │ Generate unique transaction ID
   ▼
QR Code on OLED/Display
   │
   │ Customer scans with mobile
   ▼
Mobile Browser
   │
   ▼
Dummy Payment Page
   │
   │ "Pay ₹185"
   ▼
Customer clicks "Confirm Payment"
   │
   ▼
Backend
   │
   │ Verify TX1001
   ▼
PAYMENT SUCCESS
   │
   ▼
ESP32 receives confirmation
   │
   ▼
Dispensing starts
Example
Suppose customer RFID scan karta hai:
Customer: Rahul
Customer ID: CUST001

Rice   1 kg
Sugar  3 kg

Total: ₹185
Backend transaction create karega:
Transaction ID:
TX-20261009-001
Phir QR generate hoga.
QR ke andar payment amount nahi, balki local payment URL hoga:
http://192.168.1.100:3000/pay/TX-20261009-001
OLED/LED par QR:
┌─────────────────────┐
│                     │
│       QR CODE       │
│                     │
│   Scan to Pay       │
│                     │
│      ₹185           │
└─────────────────────┘
Mobile se scan karne par
Phone ka browser automatically open karega:
SMART RATION

Customer
Rahul

Items
Rice      1 kg
Sugar     3 kg

Total
₹185

[ CONFIRM PAYMENT ]
Customer Confirm Payment press karega.
Backend:
TX-20261009-001
        ↓
PAYMENT_PENDING
        ↓
PAYMENT_SUCCESS
Mobile par:
✓ Payment Successful

Transaction ID:
TX-20261009-001

Please wait...
Your ration is being dispensed.
Aur simultaneously hardware ko WebSocket/MQTT/API se:
{
  "transaction_id": "TX-20261009-001",
  "payment_status": "SUCCESS",
  "dispense": true
}
ESP32 ko milega.
Then:
Payment SUCCESS
       ↓
Dispensing unlocked
       ↓
Rice → 1000g
       ↓
Sugar → 3000g
       ↓
Weight verification
       ↓
Inventory update
       ↓
Transaction COMPLETED
Important security point
QR scan hote hi payment successful mat karna.
QR scan sirf payment page open kare:
QR Scan
   ↓
Payment Page
   ↓
Confirm Payment
   ↓
Backend marks SUCCESS
Isse tum clearly demonstrate kar sakte ho ki QR identification hai, aur payment confirmation backend se hoti hai.
Aur agar same QR ko dobara scan kiya:
TX-20261009-001
STATUS = COMPLETED
toh page:
Transaction Already Completed
dikhayega aur dobara dispensing nahi hogi.
Mobile aur Smart ATM same Wi-Fi par
Demo ke liye laptop/PC par backend chalega:
Laptop IP:
192.168.1.100

Admin:
http://192.168.1.100:3000/admin

Payment:
http://192.168.1.100:3000/pay/TX-20261009-001
Phone aur ESP32 ko same Wi-Fi network par connect kar do. Internet ki bhi zarurat nahi padegi.
Yahi tumhare project ke liye sabse simple aur reliable dummy-payment architecture hai. Haan, mobile me automatically browser open ho jayega, but ek important condition hai: QR ke andar jo URL hai, woh mobile se reachable hona chahiye.
Tumhare local project mein kaise hoga
Maan lo tumhara laptop/backend ka local IP hai:
192.168.1.100
Backend payment page:
http://192.168.1.100:3000/pay/TX1001
QR code ke andar ye URL encode karoge.
Customer mobile camera/Google Lens se QR scan karega:
📱 Scan QR
      ↓
🔗 http://192.168.1.100:3000/pay/TX1001
      ↓
🌐 Mobile Browser opens
      ↓
SMART RATION PAYMENT
      ↓
₹185
      ↓
[ CONFIRM PAYMENT ]
Lekin ek condition hai ⚠️
Mobile aur laptop same Wi-Fi network par hone chahiye.
Example:
              Wi-Fi Router
             /     |      \
            /      |       \
       Laptop    ESP32     Mobile
     192.168.1.100         192.168.1.105
Mobile jab:
http://192.168.1.100:3000/pay/TX1001
open karega, request laptop ke local server par jayegi.
Agar mobile 4G/5G par ho?
Agar mobile Wi-Fi se disconnected hai aur sirf 5G/4G use kar raha hai, toh:
http://192.168.1.100:3000
normally open nahi hoga, kyunki 192.168.x.x private/local network address hai.
Iske liye 2 options hain:
Demo/college project → Same Wi-Fi ✅
Sabse easy.
Real-world deployment → Public HTTPS URL
Example:
https://payment.yourdomain.com/pay/TX1001
Iske liye server/VPS/cloud ya secure tunnel chahiye.
Tumhare project ke liye main recommend karunga
Initially:
Laptop
 ├── Backend
 ├── Database
 ├── Admin Panel
 └── Payment Web Page
        ↑
        │ Wi-Fi
        │
      Mobile
        ↑
        │ QR Scan
        │
      OLED
Isse internet ki zarurat nahi hai aur pura dummy payment system locally demonstrate ho jayega.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/09f8d7e6-47e6-4a15-bf6d-10a682584e60).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
