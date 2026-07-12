
-- Rename author across posts + profile
UPDATE public.posts SET author_name = 'د. عمرو فتحي'
  WHERE author_name ILIKE 'Mohamed Nasser' OR author_name ILIKE 'محمد ناصر';
UPDATE public.profiles SET display_name = 'د. عمرو فتحي'
  WHERE display_name ILIKE 'Mohamed Nasser' OR display_name ILIKE 'محمد ناصر';

-- Strip legacy text-align:justify from post content so old articles no longer
-- render huge whitespace gaps in RTL.
UPDATE public.posts
   SET content = regexp_replace(content, 'text-align:\s*justify', 'text-align: right', 'gi')
 WHERE content ILIKE '%justify%';
UPDATE public.guest_posts
   SET content = regexp_replace(content, 'text-align:\s*justify', 'text-align: right', 'gi')
 WHERE content ILIKE '%justify%';

-- Collapse any runs of multiple non-breaking spaces / normal spaces that snuck
-- in from copy-paste on old articles, so pressing space once does not look
-- like a huge gap on rendered pages.
UPDATE public.posts
   SET content = regexp_replace(content, '(&nbsp;\s*){2,}', '&nbsp;', 'gi')
 WHERE content ILIKE '%&nbsp;%&nbsp;%';
