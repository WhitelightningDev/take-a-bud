import { supabase } from '../../../lib/supabaseClient'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

export async function uploadCatalogImage(file: File, folder: string) {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : null
  const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg'
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'catalog'
  const objectPath = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath)
  return data.publicUrl
}

export function uploadProductImage(file: File, currentBrandId: string) {
  return uploadCatalogImage(file, currentBrandId || 'unbranded')
}