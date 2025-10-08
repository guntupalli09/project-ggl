import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { supabase } from '../lib/supabaseClient'

interface Contact {
  id: string
  user_id: string
  name: string
  company: string
  email: string
  status: 'Prospect' | 'Contacted' | 'In Progress' | 'Closed'
  notes: string
  created_at: string
  updated_at: string
}

interface PipelineBoardProps {
  contacts: Contact[]
  onContactUpdate: () => void
  onEditContact: (contact: Contact) => void
  onDeleteContact: (id: string) => void
  onGenerateSequence: (contact: Contact) => void
}

const COLUMNS = [
  { id: 'Prospect', title: 'Prospect', color: 'bg-gray-100' },
  { id: 'Contacted', title: 'Contacted', color: 'bg-blue-100' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-yellow-100' },
  { id: 'Closed', title: 'Closed', color: 'bg-green-100' }
] as const

const getStatusColor = (status: Contact['status']) => {
  switch (status) {
    case 'Prospect':
      return 'bg-gray-100 text-gray-800'
    case 'Contacted':
      return 'bg-blue-100 text-blue-800'
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800'
    case 'Closed':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function PipelineBoard({ 
  contacts, 
  onContactUpdate, 
  onEditContact, 
  onDeleteContact,
  onGenerateSequence
}: PipelineBoardProps) {
  // Group contacts by status
  const contactsByStatus = contacts.reduce((acc, contact) => {
    if (!acc[contact.status]) {
      acc[contact.status] = []
    }
    acc[contact.status].push(contact)
    return acc
  }, {} as Record<string, Contact[]>)

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside a valid drop zone
    if (!destination) {
      return
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStatus = destination.droppableId as Contact['status']
    const contactId = draggableId

    try {
      // Update the contact status in Supabase
      const { error } = await supabase
        .from('crm_contacts')
        .update({ status: newStatus })
        .eq('id', contactId)

      if (error) {
        console.error('Error updating contact status:', error)
        return
      }

      // Refresh the contacts list
      onContactUpdate()
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales Pipeline</h2>
        <p className="text-gray-600">Drag and drop contacts between stages</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} rounded-lg p-4 mb-4`}>
                <h3 className="font-semibold text-gray-800 text-center">
                  {column.title}
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  {contactsByStatus[column.id]?.length || 0} contacts
                </p>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {contactsByStatus[column.id]?.map((contact, index) => (
                      <Draggable
                        key={contact.id}
                        draggableId={contact.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 p-4 bg-white rounded-lg shadow-sm border transition-all ${
                              snapshot.isDragging
                                ? 'shadow-lg transform rotate-2'
                                : 'hover:shadow-md'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 text-sm truncate">
                                {contact.name}
                              </h4>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => onGenerateSequence(contact)}
                                  className="text-green-600 hover:text-green-800 text-xs"
                                >
                                  Sequence
                                </button>
                                <button
                                  onClick={() => onEditContact(contact)}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => onDeleteContact(contact.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 truncate mb-2">
                              {contact.company}
                            </p>

                            <p className="text-xs text-gray-500 truncate mb-3">
                              {contact.email}
                            </p>

                            {contact.notes && (
                              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                                {contact.notes}
                              </p>
                            )}

                            <div className="flex justify-between items-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                                {contact.status}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(contact.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
