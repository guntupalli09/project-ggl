import React, { useState, useEffect } from 'react'
import { Droppable, Draggable } from 'react-beautiful-dnd'
import { Lead } from '../hooks/useLeads'
import {
  ClockIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

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

type ContactOrLead = Lead | Contact

interface PipelineBoardProps {
  contacts?: ContactOrLead[] | undefined
  leads?: ContactOrLead[] | undefined
  onContactUpdate?: () => Promise<void>
  onUpdateLead?: (id: string, updates: Partial<Lead>) => Promise<void>
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void
  onEditContact?: (contact: ContactOrLead) => void
  onDeleteContact?: (id: string) => Promise<void>
  prefix?: string // Add prefix to make droppable IDs unique
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

export default function PipelineBoard({ contacts, leads, prefix = '' }: PipelineBoardProps) {
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, ContactOrLead[]>>({})

  // Use either contacts or leads, prioritizing contacts
  const data = contacts || leads

  // Group leads by status
  useEffect(() => {
    if (!data) {
      console.log('PipelineBoard: data is undefined')
      setLeadsByStatus({})
      return
    }
    
    console.log('PipelineBoard: data changed', data.length)
    const grouped = data.reduce((acc, lead) => {
      // Map Contact status to Lead status
      let mappedStatus = lead.status || 'new'
      if (lead.status === 'Prospect') mappedStatus = 'new'
      if (lead.status === 'Contacted') mappedStatus = 'contacted'
      if (lead.status === 'In Progress') mappedStatus = 'booked'
      if (lead.status === 'Closed') mappedStatus = 'completed'
      
      if (!acc[mappedStatus]) {
        acc[mappedStatus] = []
      }
      acc[mappedStatus].push(lead as any)
      return acc
    }, {} as Record<string, ContactOrLead[]>)

    // Ensure all columns have an array
    columns.forEach(column => {
      if (!grouped[column.status]) {
        grouped[column.status] = []
      }
    })

    console.log('PipelineBoard: grouped leads', grouped)
    setLeadsByStatus(grouped)
  }, [data])

  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No leads to display</p>
      </div>
    )
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
                <Droppable droppableId={`${prefix}${column.id}`} key={`droppable-${prefix}${column.id}`}>
                  {(provided, snapshot) => {
                    const droppableId = `${prefix}${column.id}`
                    console.log(`🎯 Droppable ${droppableId} rendered, isDraggingOver: ${snapshot.isDraggingOver}`)
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
                                    onClick={() => {/* TODO: Implement delete */}}
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
    </div>
  )
}