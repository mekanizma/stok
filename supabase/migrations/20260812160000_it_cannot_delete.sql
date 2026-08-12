/*
  IT (bilgi işlem) cannot delete inventory records.
  Only admin may DELETE.
*/

DROP POLICY IF EXISTS "writer_delete_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_delete_categories" ON public.categories;
CREATE POLICY "admin_delete_categories" ON public.categories
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "writer_delete_manufacturers" ON public.manufacturers;
DROP POLICY IF EXISTS "admin_delete_manufacturers" ON public.manufacturers;
CREATE POLICY "admin_delete_manufacturers" ON public.manufacturers
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "writer_delete_assets" ON public.assets;
DROP POLICY IF EXISTS "admin_delete_assets" ON public.assets;
CREATE POLICY "admin_delete_assets" ON public.assets
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "writer_delete_accessories" ON public.accessories;
DROP POLICY IF EXISTS "admin_delete_accessories" ON public.accessories;
CREATE POLICY "admin_delete_accessories" ON public.accessories
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "writer_delete_consumables" ON public.consumables;
DROP POLICY IF EXISTS "admin_delete_consumables" ON public.consumables;
CREATE POLICY "admin_delete_consumables" ON public.consumables
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "writer_delete_licenses" ON public.licenses;
DROP POLICY IF EXISTS "admin_delete_licenses" ON public.licenses;
CREATE POLICY "admin_delete_licenses" ON public.licenses
  FOR DELETE TO authenticated USING (public.is_admin());
