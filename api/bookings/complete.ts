// API endpoint to mark booking as service completed
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { booking_id, user_id, service_notes } = req.body

    // Validate required fields
    if (!booking_id || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: booking_id, user_id' 
      })
    }

    // Update booking status to completed
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        service_completed_at: new Date().toISOString(),
        service_completed_by: user_id,
        service_notes: service_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        service_type,
        appointment_time,
        user_id,
        leads!inner(id, name, email, phone)
      `)
      .single()

    if (bookingError || !booking) {
      console.error('Error updating booking:', bookingError)
      return res.status(500).json({ 
        error: 'Failed to complete booking',
        details: bookingError?.message 
      })
    }

    // Get business settings for workflow data
    const { data: businessSettings } = await supabase
      .from('user_settings')
      .select('business_name, niche_template_id')
      .eq('user_id', user_id)
      .single()

    // Prepare workflow data
    const workflowData = {
      booking_id: booking.id,
      lead_id: booking.leads?.id,
      user_id: booking.user_id,
      business_name: businessSettings?.business_name || 'Our Business',
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_type: booking.service_type,
      booking_time: booking.appointment_time,
      service_notes: service_notes
    }

    // Trigger post-service workflow
    try {
      const { workflowEngine } = await import('../../src/lib/workflowEngine')
      
      // Trigger review request workflow
      await workflowEngine.triggerWorkflow('booking_completed', workflowData)
      
      console.log(`✅ Service completed and workflow triggered for booking ${booking_id}`)
    } catch (workflowError) {
      console.error('Error triggering workflow:', workflowError)
      // Don't fail the booking completion if workflow fails
    }

    // Log the completion
    console.log(`Service completed:`, {
      booking_id: booking.id,
      customer: booking.customer_name,
      service: booking.service_type,
      completed_by: user_id
    })

    return res.status(200).json({
      success: true,
      message: 'Service completed successfully',
      booking: {
        id: booking.id,
        status: 'completed',
        service_completed_at: booking.service_completed_at
      }
    })

  } catch (error) {
    console.error('Error in booking completion:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
