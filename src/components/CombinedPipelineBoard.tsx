import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import PipelineBoard from './PipelineBoard'
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

interface CombinedPipelineBoardProps {
  leads: Lead[]
  contacts: Contact[]
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  onUpdateContact: (id: string, updates: Partial<Contact>) => void
}

export default function CombinedPipelineBoard({ 
  leads, 
  contacts, 
  onUpdateLead, 
  onUpdateContact 
}: CombinedPipelineBoardProps) {
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    console.log('🎯 Drag End Result:', { destination, source, draggableId })

    if (!destination) {
      console.log('❌ No destination, drag cancelled')
      return
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('❌ Same position, no change needed')
      return
    }

    // Determine which pipeline the drag came from
    const isLeadsPipeline = source.droppableId.startsWith('leads-')
    const isContactsPipeline = source.droppableId.startsWith('contacts-')

    console.log('🔍 Pipeline detection:', { isLeadsPipeline, isContactsPipeline, sourceDroppableId: source.droppableId })

    if (isLeadsPipeline) {
      // Handle leads pipeline drag
      const lead = leads.find(l => l.id === draggableId)
      console.log('👤 Found lead:', lead)
      if (!lead) {
        console.log('❌ Lead not found for ID:', draggableId)
        return
      }

      const newStatus = destination.droppableId.replace('leads-', '') as Lead['status']
      console.log('📝 Updating lead status:', { leadId: lead.id, newStatus, from: source.droppableId, to: destination.droppableId })
      await onUpdateLead(lead.id, { status: newStatus })
    } else if (isContactsPipeline) {
      // Handle contacts pipeline drag
      const contact = contacts.find(c => c.id === draggableId)
      console.log('👤 Found contact:', contact)
      if (!contact) {
        console.log('❌ Contact not found for ID:', draggableId)
        return
      }

      const newStatus = destination.droppableId.replace('contacts-', '') as Contact['status']
      console.log('📝 Updating contact status:', { contactId: contact.id, newStatus, from: source.droppableId, to: destination.droppableId })
      onUpdateContact(contact.id, { status: newStatus })
    } else {
      console.log('❌ Unknown pipeline type:', source.droppableId)
    }
  }

  const handleDragStart = (start: any) => {
    console.log('🚀 Drag Start:', start)
  }

  const handleDragUpdate = (update: any) => {
    console.log('🔄 Drag Update:', update)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leads Pipeline</h3>
        <DragDropContext 
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
        >
          <PipelineBoard leads={leads} onUpdateLead={onUpdateLead} prefix="leads-" />
        </DragDropContext>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contacts Pipeline</h3>
        <DragDropContext 
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
        >
          <PipelineBoard contacts={contacts} onUpdateContact={onUpdateContact} prefix="contacts-" />
        </DragDropContext>
      </div>
    </div>
  )
}
