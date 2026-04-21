import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

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
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return { rows: data, count: data?.length };
  }
};

export const supabaseRawSqlTool = {
  name: "query_supabase_sql",
  description: "Run raw SQL against the BARONS Supabase database. Use for complex PnL calculations, forecasting, cross-market aggregations and joins.",
  schema: z.object({
    sql: z.string().describe("SQL query e.g. 'SELECT market, SUM(revenue) FROM analytics__orders GROUP BY market ORDER BY SUM(revenue) DESC'")
  }),
  initialize: (_client: unknown) => {},
  execute: async (args: { sql: string }) => {
    const { data, error } = await supabase.rpc("execute_sql", { query: args.sql });
    if (error) throw new Error(`SQL error: ${error.message}`);
    return { rows: data };
  }
};
