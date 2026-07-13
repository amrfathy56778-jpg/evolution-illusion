
UPDATE public.posts SET author_name = 'د. عمرو فتحي' WHERE author_id = '99780627-7a6e-4483-89c8-39376a66e0cb';
UPDATE public.profiles SET display_name = 'د. عمرو فتحي' WHERE id = '99780627-7a6e-4483-89c8-39376a66e0cb';

CREATE OR REPLACE FUNCTION public.force_amr_author_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author_id = '99780627-7a6e-4483-89c8-39376a66e0cb' THEN
    NEW.author_name := 'د. عمرو فتحي';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS force_amr_author_name_trg ON public.posts;
CREATE TRIGGER force_amr_author_name_trg
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.force_amr_author_name();
