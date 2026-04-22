import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    console.log(`[Supabase] Initializing with URL: ${url ? url : 'MISSING'}`);
    console.log(`[Supabase] Key present: ${key ? 'YES' : 'MISSING'}`);
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
    _supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });
    console.log(`[Supabase] Client created successfully`);
  }
  return _supabase;
}

export const supabaseQueryTool = {
  name: "query_supabase",
  description: "Query the BARONS analytics database. Use for revenue, PnL, orders, refunds, SKU sales, marketing spend across DK/NL/NO/SE markets.",
  schema: z.object({
    table: z.string().describe("Table name e.g. 'analytics__commercial_report', 'analytics__orders', 'core__orders_master', 'analytics__sku_sales'"),
    select: z.string().optional().describe("Columns to select, default '*'"),
    filters: z.record(z.string()).optional().describe("Key-value filters e.g. { market: 'DK' }"),
    limit: z.number().optional().describe("Max rows, default 100"),
    order_by: z.string().optional().describe("Column to order by e.g. 'date'"),
    order_asc: z.boolean().optional().describe("true = ascending, false = descending")
  }),
  initialize: (_client: unknown) => {},
  execute: async (args: {
    table: string;
    select?: string;
    filters?: Record<string, string>;
    limit?: number;
    order_by?: string;
    order_asc?: boolean;
  }) => {
    try {
      console.log(`[Supabase] Querying table: ${args.table}`);
      const supabase = getSupabase();

      let query = supabase
        .from(args.table)
        .select(args.select || "*")
        .limit(args.limit || 100);

      if (args.filters) {
        for (const [key, value] of Object.entries(args.filters)) {
          query = query.eq(key, value);
        }
      }

      if (args.order_by) {
        query = query.order(args.order_by, { ascending: args.order_asc ?? false });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[Supabase] Query error:`, JSON.stringify(error));
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log(`[Supabase] Success, rows returned: ${data?.length}`);
      return { rows: data, count: data?.length };
    } catch (err) {
      console.error(`[Supabase] Exception in query_supabase:`, err);
      throw err;
    }
  }
};

export const supabaseRawSqlTool = {
  name: "query_supabase_sql",
  description: "Run raw SQL against the BARONS Supabase database. Use for complex PnL calculations, forecasting, cross-market aggregations and joins.",
  schema: z.object({
    sql: z.string().describe("SQL query e.g. 'SELECT country_code, SUM(net_sales_current) FROM analytics__commercial_report GROUP BY country_code ORDER BY SUM(net_sales_current) DESC'")
  }),
  initialize: (_client: unknown) => {},
  execute: async (args: { sql: string }) => {
    try {
      console.log(`[Supabase] Running SQL: ${args.sql}`);
      const supabase = getSupabase();

      const { data, error } = await supabase.rpc("execute_sql", { query: args.sql });

      if (error) {
        console.error(`[Supabase] SQL error:`, JSON.stringify(error));
        throw new Error(`SQL error: ${error.message}`);
      }

      console.log(`[Supabase] SQL success`);
      return { rows: data };
    } catch (err) {
      console.error(`[Supabase] Exception in query_supabase_sql:`, err);
      throw err;
    }
  }
};
