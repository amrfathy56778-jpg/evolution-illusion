
-- 1) Collapse chains of empty paragraphs in stored article HTML to a single one
UPDATE public.posts SET content = regexp_replace(
  regexp_replace(content, '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}', '<p></p>', 'g'),
  '(<p>(\s|&nbsp;)*<br\s*/?>(\s|&nbsp;)*</p>\s*){2,}', '<p></p>', 'g'
) WHERE content ~ '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}';

UPDATE public.guest_posts SET content = regexp_replace(
  regexp_replace(content, '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}', '<p></p>', 'g'),
  '(<p>(\s|&nbsp;)*<br\s*/?>(\s|&nbsp;)*</p>\s*){2,}', '<p></p>', 'g'
) WHERE content ~ '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}';

-- 2) Per-user saved AI themes
CREATE TABLE public.user_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tokens JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_themes TO authenticated;
GRANT ALL ON public.user_themes TO service_role;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own themes select" ON public.user_themes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own themes insert" ON public.user_themes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own themes update" ON public.user_themes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own themes delete" ON public.user_themes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX user_themes_user_idx ON public.user_themes(user_id, created_at DESC);
