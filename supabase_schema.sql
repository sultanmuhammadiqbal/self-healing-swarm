CREATE TABLE IF NOT EXISTS public.swarm_audit_logs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    product_name TEXT NOT NULL DEFAULT '',
    product_url TEXT NOT NULL,
    issue_type TEXT NOT NULL DEFAULT 'CTR_DROP_GSC',
    status TEXT NOT NULL DEFAULT 'APPROVED',
    final_score INTEGER NOT NULL DEFAULT 0,
    iterations INTEGER NOT NULL DEFAULT 1,
    metric_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_solution JSONB NOT NULL DEFAULT '{}'::jsonb,
    debate_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_status TEXT NOT NULL DEFAULT 'PENDING',
    approved_at TIMESTAMPTZ
);
