import { useCallback, useEffect, useState } from 'react'
import { toAppError } from '../../../lib/appError'
import { isSupabaseConfigured, supabase } from '../../../lib/supabaseClient'
import type { Brand, Product, ProfileRow } from '../types'

export function useAdminData() {
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandsError, setBrandsError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)
    setProfilesError(null)

    try {
      const primary = (await supabase
        .from('profiles')
        .select(
          'id, email, full_name, first_name, last_name, id_number, address, accepted_regulations, accepted_regulations_at, is_admin, created_at',
        )
        .order('created_at', { ascending: false })) as unknown as {
        data: ProfileRow[] | null
        error: { message: string } | null
      }

      const result =
        primary.error && primary.error.message.includes('column')
          ? ((await supabase
              .from('profiles')
              .select(
                'id, full_name, first_name, last_name, id_number, address, accepted_regulations, accepted_regulations_at, is_admin, created_at',
              )
              .order('created_at', { ascending: false })) as unknown as {
              data: Omit<ProfileRow, 'email'>[] | null
              error: { message: string } | null
            })
          : primary

      if (result.error) throw result.error

      setProfiles((result.data ?? []) as unknown as ProfileRow[])
    } catch (error) {
      const appError = toAppError(error)
      setProfilesError(appError.message)
      setProfiles([])
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    setBrandsError(null)

    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url, active, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setBrands((data ?? []) as Brand[])
    } catch (error) {
      const appError = toAppError(error)
      setBrandsError(appError.message)
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)

    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, name, description, price_cents, image_url, active, created_at, brand_id, strain_type, consumption_method, stock_qty, category, featured_on_landing, brand:brands(id, name, logo_url)',
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      setProducts((data ?? []) as unknown as Product[])
    } catch (error) {
      const appError = toAppError(error)
      setProductsError(appError.message)
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const reloadAdminData = useCallback(async () => {
    await loadBrands()
    await loadProducts()
    await loadProfiles()
  }, [loadBrands, loadProducts, loadProfiles])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void reloadAdminData()
  }, [reloadAdminData])

  return {
    products,
    productsLoading,
    productsError,
    loadProducts,

    brands,
    brandsLoading,
    brandsError,
    loadBrands,

    profiles,
    profilesLoading,
    profilesError,
    loadProfiles,

    reloadAdminData,
  }
}