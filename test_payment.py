import sys
import requests
import json

# ========================================================
# CONFIGURATION - Set your live Vercel URL here:
# ========================================================
DEFAULT_WEBSITE_URL = "https://self-nine-wine.vercel.app/"  # Or "https://your-app.vercel.app"
DEFAULT_ORDER_ID = "ORD-123456"

# You can pass URL and Order ID as command-line arguments:
# Example: python test_payment.py ORD-999888 https://your-site.vercel.app
order_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ORDER_ID
website_url = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_WEBSITE_URL

# Clean URL
website_url = website_url.rstrip("/")

print(f"Target Website: {website_url}")
print(f"Approving Order ID: {order_id}...")

payload = {
    "orderId": order_id,
    "amount": 1.0,
    "status": "Paid"
}

try:
    verify_url = f"{website_url}/api/orders/verify"
    res = requests.post(verify_url, json=payload, timeout=10)
    print("HTTP Status Code:", res.status_code)
    print("Server Response:", res.json())
    
    if res.status_code == 200 and res.json().get("success"):
        print(f"\n✅ SUCCESS! Order {order_id} has been marked as PAID on {website_url}.")
        print(f"Check status at: {website_url}/api/orders/{order_id}/status")
    else:
        print(f"\n❌ FAILED! Could not verify order {order_id}: {res.text}")
except Exception as e:
    print(f"\n❌ Error connecting to {website_url}: {e}")
