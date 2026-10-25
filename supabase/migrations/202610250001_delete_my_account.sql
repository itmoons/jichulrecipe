-- Review cascading foreign keys and Storage cleanup before enabling in production.
create or replace function public.delete_my_account(consent boolean, confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if consent is distinct from true or confirmation is distinct from '계정 삭제' then
    raise exception 'Explicit deletion consent required';
  end if;
  if exists (select 1 from pg_catalog.pg_constraint c where c.contype = 'f'
    and c.confrelid = 'auth.users'::regclass and c.connamespace = 'public'::regnamespace
    and c.confdeltype <> 'c') then
    raise exception 'Account data cleanup is not configured';
  end if;
  if exists (select 1 from storage.objects where owner_id = caller::text) then
    raise exception 'Account storage cleanup is required';
  end if;
  delete from auth.users where id = caller;
  if not found then raise exception 'Account not found'; end if;
end;
$$;
revoke all on function public.delete_my_account(boolean, text) from public, anon;
grant execute on function public.delete_my_account(boolean, text) to authenticated;
