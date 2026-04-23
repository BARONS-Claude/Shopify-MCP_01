import { createClient } from '@supabase/supabase-js';

// Production client (BARONS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Test client
const supabaseTest = createClient(
  process.env.SUPABASE_URL_TEST!,
  process.env.SUPABASE_SECRET_KEY_TEST!
);

export const supabaseTools = [
  {
    name: "query_supabase",
    description: "Query the BARONS Supabase database. Use this to analyse orders, revenue, PnL, marketing spend, SKU sales and other business data.",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Table or view name to query, e.g. 'analytics__commercial_report', 'analytics__orders', 'core__orders_master'"
        },
        select: {
          type: "string",
          description: "Columns to select, e.g. '*' or 'date, revenue, market'"
        },
        filters: {
          type: "object",
          description: "Optional key-value filters, e.g. { market: 'DK' }"
        },
        limit: {
          type: "number",
          description: "Max rows to return (default 100)"
        }
      },
      required: ["table"]
    },
    handler: async (input: { table: string; select?: string; filters?: Record<string, string>; limit?: number }) => {
      let query = supabase
        .from(input.table)
        .select(input.select || '*')
        .limit(input.limit || 100);
      if (input.filters) {
        for (const [key, value] of Object.entries(input.filters)) {
          query = query.eq(key, value);
        }
      }
      const { data, error } = await query;
      if (error) throw new Error(`Supabase error: ${error.message}`);
      return { rows: data, count: data?.length };
    }
  },
  {
    name: "query_supabase_sql",
    description: "Run a raw SQL query against the BARONS Supabase database for complex analysis like PnL, forecasting, and aggregations.",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL query to execute, e.g. 'SELECT market, SUM(revenue) FROM analytics__orders GROUP BY market'"
        }
      },
      required: ["sql"]
    },
    handler: async (input: { sql: string }) => {
      const { data, error } = await supabase.rpc('execute_sql', { query: input.sql });
      if (error) throw new Error(`SQL error: ${error.message}`);
      return { rows: data };
    }
  },
  {
    name: "query_supabase_test",
    description: "Query the TEST Supabase database. Use this to explore and analyse data in the test project.",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Table or view name to query"
        },
        select: {
          type: "string",
          description: "Columns to select, e.g. '*' or 'id, name'"
        },
        filters: {
          type: "object",
          description: "Optional key-value filters"
        },
        limit: {
          type: "number",
          description: "Max rows to return (default 100)"
        }
      },
      required: ["table"]
    },
    handler: async (input: { table: string; select?: string; filters?: Record<string, string>; limit?: number }) => {
      let query = supabaseTest
        .from(input.table)
        .select(input.select || '*')
        .limit(input.limit || 100);
      if (input.filters) {
        for (const [key, value] of Object.entries(input.filters)) {
          query = query.eq(key, value);
        }
      }
      const { data, error } = await query;
      if (error) throw new Error(`Supabase TEST error: ${error.message}`);
      return { rows: data, count: data?.length };
    }
  },
  {
    name: "query_supabase_sql_test",
    description: "Run a raw SQL query against the TEST Supabase database.",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL query to execute"
        }
      },
      required: ["sql"]
    },
    handler: async (input: { sql: string }) => {
      const { data, error } = await supabaseTest.rpc('execute_sql', { query: input.sql });
      if (error) throw new Error(`SQL TEST error: ${error.message}`);
      return { rows: data };
    }
  }
];
