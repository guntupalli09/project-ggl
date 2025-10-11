import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Lead } from '../hooks/useLeads'
import {
  ClockIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface PipelineBoardProps {
  contacts: Lead[] | undefined
  onContactUpdate: () => Promise<void>
  onEditContact: (contact: Lead) => void
  onDeleteContact: (id: string) => Promise<void>
}

interface Column {
  id: string
  title: string
  status: string
  color: string
  icon: React.ComponentType<any>
}

const columns: Column[] = [
  {
    id: 'new',
    title: 'New',
    status: 'new',
    color: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200',
    icon: ClockIcon
  },
  {
    id: 'contacted',
    title: 'Contacted',
    status: 'contacted',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200',
    icon: PhoneIcon
  },
  {
    id: 'booked',
    title: 'Booked',
    status: 'booked',
    color: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-200',
    icon: CalendarIcon
  },
  {
    id: 'completed',
    title: 'Completed',
    status: 'completed',
    color: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200',
    icon: CheckCircleIcon
  }
]

export default function PipelineBoard({ contacts, onContactUpdate, onEditContact, onDeleteContact }: PipelineBoardProps) {
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, Lead[]>>({})

  // Group leads by status
  useEffect(() => {
    if (!contacts) {
      console.log('PipelineBoard: contacts is undefined')
      setLeadsByStatus({})
      return
    }
    
    console.log('PipelineBoard: contacts changed', contacts.length)
    const grouped = contacts.reduce((acc, lead) => {
      const status = lead.status || 'new'
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(lead)
      return acc
    }, {} as Record<string, Lead[]>)

    // Ensure all columns have an array
    columns.forEach(column => {
      if (!grouped[column.status]) {
        grouped[column.status] = []
      }
    })

    console.log('PipelineBoard: grouped leads', grouped)
    setLeadsByStatus(grouped)
  }, [contacts])

  // Don't render if no contacts
  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No leads to display</p>
      </div>
    )
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    console.log('Drag end result:', { destination, source, draggableId })
    console.log('Available droppable IDs:', columns.map(col => col.id))

    if (!destination) {
      console.log('No destination, drag cancelled')
      return
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId)
    const destColumn = columns.find(col => col.id === destination.droppableId)

    console.log('Source column:', sourceColumn)
    console.log('Destination column:', destColumn)

    if (!sourceColumn || !destColumn) {
      console.error('Column not found:', { sourceColumn, destColumn })
      return
    }

    // Find the contact being moved
    if (!contacts) {
      console.error('Contacts array is undefined')
      return
    }
    
    const contact = contacts.find(c => c.id === draggableId)
    console.log('Found contact:', contact)
    console.log('Available contacts:', contacts.map(c => c.id))
    if (!contact) {
      console.error('Contact not found:', draggableId)
      return
    }

    // Update the contact's status
    try {
      console.log(`Updating contact ${contact.id} from ${sourceColumn.status} to ${destColumn.status}`)
      
      // Update the contact status in the local state first
      setLeadsByStatus(prev => {
        const newState = { ...prev }
        
        // Remove from source column
        if (newState[sourceColumn.id]) {
          newState[sourceColumn.id] = newState[sourceColumn.id].filter(c => c.id !== contact.id)
        }
        
        // Add to destination column with updated status
        if (!newState[destColumn.id]) {
          newState[destColumn.id] = []
        }
        newState[destColumn.id].push({
          ...contact,
          status: destColumn.status as Lead['status']
        })
        
        return newState
      })
      
      // Trigger parent component refresh
      await onContactUpdate()
      console.log('Contact status updated successfully')
    } catch (error) {
      console.error('Error updating contact status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Lead Pipeline
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Drag and drop leads between stages to update their status
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => {
            const columnLeads = leadsByStatus[column.status] || []
            const IconComponent = column.icon

            console.log(`Rendering column: ${column.id} with ${columnLeads.length} leads`)

            return (
              <div key={column.id} className="flex flex-col" data-column-id={column.id}>
                {/* Column Header */}
                <div className={`${column.color} rounded-lg p-4 mb-4 border-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5" />
                      <h3 className="font-semibold">{column.title}</h3>
                    </div>
                    <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id} key={`droppable-${column.id}`}>
                  {(provided, snapshot) => {
                    console.log(`Droppable ${column.id} rendered, isDraggingOver: ${snapshot.isDraggingOver}`)
                    return (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {columnLeads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                            >
                              {/* Lead Card Content */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {lead.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {lead.email}
                                    </p>
                                    {lead.phone && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {lead.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {lead.notes && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {lead.notes}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <span>{formatDate(lead.created_at)}</span>
                                  {lead.source && (
                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                      {lead.source}
                                    </span>
                                  )}
                                </div>

                                <div className="flex justify-end">
                                  <button
                                    onClick={() => onLeadDelete(lead.id)}
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                    title="Delete lead"
                                  >
                                    <XCircleIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                    )
                  }}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}