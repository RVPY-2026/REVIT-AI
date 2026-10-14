/** No credentials in cron.job.command. Vault secrets are resolved only when a due, unblocked item exists. */
export const ZALO_OUTBOX_CRON_COMMAND = `
select net.http_get(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'rvpy_zalo_worker_url'),
  headers := jsonb_build_object('Authorization', 'Bearer ' ||
    (select decrypted_secret from vault.decrypted_secrets where name = 'rvpy_zalo_worker_secret')),
  timeout_milliseconds := 50000
)
where exists (
  select 1 from public.zalo_bot_outbox item
  where item.status = 'pending' and item.available_at <= now()
  and not exists (
    select 1 from public.zalo_bot_outbox earlier
    where earlier.chat_id = item.chat_id and earlier.status <> 'sent'
    and (earlier.created_at < item.created_at
      or (earlier.created_at = item.created_at and earlier.sequence < item.sequence))
  )
);`;
