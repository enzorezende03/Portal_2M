-- Remove agendamento anterior se existir, para tornar idempotente
DO $$
BEGIN
  PERFORM cron.unschedule('gclick-sync-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'gclick-sync-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--6f467a57-4592-43d4-9b49-5cbed61031df.lovable.app/api/public/gclick-sync?dias=7',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreHp4eW1mdmFrZWx5YW5nc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzE4MjMsImV4cCI6MjA5MzY0NzgyM30.uBDLIc_EGHHqGVDm52tdDLIxm81ywTQPL3FFMTwCq00"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);