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
}

export default function DndKitCombinedPipelineBoard({ 
  leads, 
  contacts, 
  onUpdateLead, 
  onUpdateContact 
}: DndKitCombinedPipelineBoardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leads Pipeline</h3>
        <DndKitPipelineBoard 
          leads={leads} 
          onUpdateLead={onUpdateLead} 
          prefix="leads-" 
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contacts Pipeline</h3>
        <DndKitPipelineBoard 
          contacts={contacts} 
          onUpdateContact={onUpdateContact} 
          prefix="contacts-" 
        />
      </div>
    </div>
  )
}
