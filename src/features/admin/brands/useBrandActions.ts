

import { useState } from 'react'
import type { Brand } from '../types'
import type { BrandFormValues } from './BrandForm'
import { supabase } from '../../../lib/supabaseClient'

function mapFormToInsert(values: BrandFormValues) {
  return {
    name: values.name.trim(),
    logo_url: values.logo_url?.trim() || null,
  }
}

export function useBrandActions(initialBrands: Brand[] = []) {
  const [brands, setBrands] = useState<Brand[]>(initialBrands)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // --- LOAD ---
  const loadBrands = async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data) {
      setBrands(data)
    }

    setIsLoading(false)
  }

  // --- CREATE ---
  const createBrand = async (values: BrandFormValues) => {
    setIsSaving(true)

    const payload = mapFormToInsert(values)

    const { data, error } = await supabase
      .from('brands')
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      setBrands((prev) => [data, ...prev])
    }

    setIsSaving(false)
  }

  // --- UPDATE ---
  const updateBrand = async (brandId: string, values: BrandFormValues) => {
    setIsSaving(true)

    const payload = mapFormToInsert(values)

    const { data, error } = await supabase
      .from('brands')
      .update(payload)
      .eq('id', brandId)
      .select()
      .single()

    if (!error && data) {
      setBrands((prev) => prev.map((b) => (b.id === brandId ? data : b)))
    }

    setIsSaving(false)
  }

  // --- DELETE ---
  const deleteBrand = async (brand: Brand) => {
    setIsSaving(true)

    const { error } = await supabase.from('brands').delete().eq('id', brand.id)

    if (!error) {
      setBrands((prev) => prev.filter((b) => b.id !== brand.id))
    }

    setIsSaving(false)
  }

  return {
    brands,
    isLoading,
    isSaving,
    loadBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  }
}