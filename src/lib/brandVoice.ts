import { supabase } from './supabaseClient'

export interface BrandVoice {
  brand_tone: string
  sample_copy?: string
}

export const getBrandVoice = async (): Promise<BrandVoice | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('brand_voice')
      .select('brand_tone, sample_copy')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching brand voice:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

export const formatBrandVoiceForPrompt = (brandVoice: BrandVoice | null): string => {
  if (!brandVoice) return ''

  let prompt = `\n\nBrand Voice Guidelines:\n${brandVoice.brand_tone}`
  
  if (brandVoice.sample_copy) {
    prompt += `\n\nSample Writing Style:\n${brandVoice.sample_copy}`
  }

  prompt += `\n\nPlease ensure all generated content follows this brand voice and writing style.`

  return prompt
}
