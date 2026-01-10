import DndKitPipelineBoard from './DndKitPipelineBoard'
import { Lead } from '../hooks/useLeads'

interface Contact {
  id: string
  name: string
  company: string
  email: string
  status: 'Prospect' | 'Contacted' | 'In Progress' | 'Closed'
  notes?: string
  created_at: string
  updated_at: string
  user_id: string
  phone?: string
  source?: string
}

interface DndKitCombinedPipelineBoardProps {
  leads: Lead[]
  contacts: Contact[]
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  onUpdateContact: (id: string, updates: Partial<Contact>) => void
  showLeadsPipeline?: boolean
  showContactsPipeline?: boolean
}

export default function DndKitCombinedPipelineBoard({ 
  leads, 
  contacts, 
  onUpdateLead, 
  onUpdateContact,
  showLeadsPipeline = true,
  showContactsPipeline = true
}: DndKitCombinedPipelineBoardProps) {
  // If only one pipeline should be shown, use full width
  if (!showLeadsPipeline || !showContactsPipeline) {
    return (
      <div className="w-full">
        {showLeadsPipeline && (
          <div>
            <DndKitPipelineBoard 
              leads={leads} 
              onUpdateLead={onUpdateLead} 
              prefix="leads-" 
            />
          </div>
        )}
        {showContactsPipeline && (
          <div>
            <DndKitPipelineBoard 
              contacts={contacts} 
              onUpdateContact={onUpdateContact} 
              prefix="contacts-" 
            />
          </div>
        )}
      </div>
    )
  }

  // If both pipelines should be shown, use two-column layout
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <DndKitPipelineBoard 
          leads={leads} 
          onUpdateLead={onUpdateLead} 
          prefix="leads-" 
        />
      </div>
      <div>
        <DndKitPipelineBoard 
          contacts={contacts} 
          onUpdateContact={onUpdateContact} 
          prefix="contacts-" 
        />
      </div>
    </div>
  )
}
