
import { toast } from '../../../hooks/use-toast'
import { toAppError } from '../../../lib/appError'
import { supabase } from '../../../lib/supabaseClient'
import type { Product } from '../types'

export function useStockActions({ reload }: { reload: () => Promise<void> }) {
  async function toggleFeatured(product: Product) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ featured_on_landing: !product.featured_on_landing })
        .eq('id', product.id)

      if (error) throw error

      await reload()

      toast({
        title: product.featured_on_landing ? 'Item unfeatured' : 'Item featured',
        description: `${product.name} was updated for the landing page.`,
      })
    } catch (error) {
      const appError = toAppError(error)
      toast({
        variant: 'destructive',
        title: appError.title,
        description: appError.message,
      })
    }
  }

  async function toggleActive(product: Product) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !product.active })
        .eq('id', product.id)

      if (error) throw error

      await reload()

      toast({
        title: product.active ? 'Item hidden' : 'Item activated',
        description: `${product.name} is ${product.active ? 'hidden from' : 'visible in'} the store.`,
      })
    } catch (error) {
      const appError = toAppError(error)
      toast({
        variant: 'destructive',
        title: appError.title,
        description: appError.message,
      })
    }
  }

  async function deleteProduct(product: Product) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id)

      if (error) throw error

      await reload()

      toast({
        title: 'Item deleted',
        description: `${product.name} was removed from stock.`,
      })
    } catch (error) {
      const appError = toAppError(error)
      toast({
        variant: 'destructive',
        title: appError.title,
        description: appError.message,
      })
    }
  }

  return {
    toggleFeatured,
    toggleActive,
    deleteProduct,
  }
}