CREATE TABLE public.ai_index (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_index_singleton CHECK (id = 1)
);

GRANT SELECT ON public.ai_index TO anon, authenticated;
GRANT ALL ON public.ai_index TO service_role;

ALTER TABLE public.ai_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read ai_index" ON public.ai_index FOR SELECT USING (true);
CREATE POLICY "staff can upsert ai_index" ON public.ai_index FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER ai_index_touch BEFORE UPDATE ON public.ai_index
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.ai_index (id, data) VALUES (1, '[]'::jsonb) ON CONFLICT DO NOTHING;