
CREATE TYPE public.subscription_kind AS ENUM ('reader','publisher','staff');

CREATE TABLE public.notification_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  kind public.subscription_kind NOT NULL DEFAULT 'reader',
  categories public.post_category[] NOT NULL DEFAULT ARRAY[]::public.post_category[],
  all_categories boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX idx_notif_subs_user ON public.notification_subscriptions(user_id);

ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.notification_subscriptions FOR INSERT
  WITH CHECK (
    char_length(email) >= 5
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (auth.uid() IS NULL OR auth.uid() = user_id)
  );

CREATE POLICY "Users view own subscription"
  ON public.notification_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

CREATE POLICY "Users update own subscription"
  ON public.notification_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own subscription"
  ON public.notification_subscriptions FOR DELETE
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

CREATE TRIGGER trg_notif_subs_updated
  BEFORE UPDATE ON public.notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
