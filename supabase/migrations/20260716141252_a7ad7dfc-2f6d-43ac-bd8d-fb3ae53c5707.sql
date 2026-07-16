
UPDATE public.posts
SET content = regexp_replace(content, '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}', '<p></p>', 'g')
WHERE content ~ '(<p>(\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}';
