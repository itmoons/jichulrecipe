# Account deletion rollout

The account-delete page requires an unchecked consent checkbox and exact confirmation text. The authenticated RPC independently validates both and derives the target account from auth.uid().

Before applying migrations/202610250001_delete_my_account.sql:
- Inspect the production schema: every personal record must have a verified cascade path to auth.users. Check records without foreign keys, indirect relationships, shared couple records, and triggers; the RPC guard alone cannot verify these.
- Implement Storage API cleanup for accounts with uploaded receipts. The RPC currently refuses to delete accounts owning Storage objects.
- Test on a disposable account: reject missing consent and anonymous requests; verify all personal records and sessions are removed and the partner account survives.
- Apply the migration in Supabase and deploy the Next.js app. No production database changes or deployment have been performed by this change.
