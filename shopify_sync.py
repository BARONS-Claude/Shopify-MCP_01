import os
import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone
import time

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "barons-dk.myshopify.com")
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_TOKEN")
SUPABASE_URL = os.environ.get("SUPABASE_URL")

HEADERS = {
    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
    "Content-Type": "application/json"
}

def get_db():
    return psycopg2.connect(SUPABASE_URL)

def shopify_get(endpoint, params={}):
    url = f"https://{SHOPIFY_STORE}/admin/api/2024-01/{endpoint}"
    results = []
    while url:
        r = requests.get(url, headers=HEADERS, params=params)
        r.raise_for_status()
        data = r.json()
        key = list(data.keys())[0]
        results.extend(data[key])
        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split(";")[0].strip().strip("<>")
        params = {}
        time.sleep(0.5)
    return results

def upsert_table(conn, table_name, rows):
    if not rows:
        print(f"  Ingen data til {table_name}")
        return
    cur = conn.cursor()
    columns = list(rows[0].keys())
    values = [[str(row.get(col)) if row.get(col) is not None else None for col in columns] for row in rows]
    cols_str = ", ".join([f'"{c}"' for c in columns])
    placeholders = ", ".join(["%s"] * len(columns))
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            {", ".join([f'"{c}" TEXT' for c in columns])}
        )
    """)
    execute_values(
        cur,
        f'INSERT INTO "{table_name}" ({cols_str}) VALUES %s ON CONFLICT DO NOTHING',
        values
    )
    conn.commit()
    print(f"  {table_name}: {len(rows)} rækker synkroniseret")

def sync():
    print(f"\n=== Shopify sync startet: {datetime.now(timezone.utc)} ===")
    conn = get_db()

    endpoints = [
        ("orders.json", {"status": "any", "limit": 250}, "shopify_orders"),
        ("customers.json", {"limit": 250}, "shopify_customers"),
        ("products.json", {"limit": 250}, "shopify_products"),
        ("inventory_levels.json", {"limit": 250}, "shopify_inventory_levels"),
        ("fulfillments.json", {"limit": 250}, "shopify_fulfillments"),
        ("draft_orders.json", {"limit": 250}, "shopify_draft_orders"),
    ]

    for endpoint, params, table in endpoints:
        try:
            print(f"\nHenter {table}...")
            data = shopify_get(endpoint, params)
            upsert_table(conn, table, data)
        except Exception as e:
            print(f"  FEJL ved {table}: {e}")

    conn.close()
    print(f"\n=== Sync færdig: {datetime.now(timezone.utc)} ===")

if __name__ == "__main__":
    sync()
