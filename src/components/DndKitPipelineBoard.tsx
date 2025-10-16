import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

type ContactOrLead = Lead | Contact

interface DndKitPipelineBoardProps {
  contacts?: ContactOrLead[] | undefined
  leads?: ContactOrLead[] | undefined
  onContactUpdate?: () => Promise<void>
  onUpdateLead?: (id: string, updates: Partial<Lead>) => Promise<void>
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void
  onEditContact?: (contact: ContactOrLead) => void
  onDeleteContact?: (id: string) => Promise<void>
  prefix?: string
}

const columns = [
  { id: 'new', title: 'New', color: 'bg-blue-100 dark:bg-blue-900', icon: () => <div className="w-3 h-3 bg-blue-500 rounded-full" /> },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-100 dark:bg-yellow-900', icon: () => <div className="w-3 h-3 bg-yellow-500 rounded-full" /> },
  { id: 'booked', title: 'Booked', color: 'bg-green-100 dark:bg-green-900', icon: () => <div className="w-3 h-3 bg-green-500 rounded-full" /> },
  { id: 'completed', title: 'Completed', color: 'bg-purple-100 dark:bg-purple-900', icon: () => <div className="w-3 h-3 bg-purple-500 rounded-full" /> },
]

function DroppableColumn({ 
  column, 
  leads, 
  onDelete 
}: { 
  column: typeof columns[0], 
  leads: ContactOrLead[], 
  onDelete?: (id: string) => Promise<void> 
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex flex-col" data-column-id={column.id}>
      {/* Column Header */}
      <div className={`${column.color} rounded-lg p-4 mb-4 border-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <column.icon />
            <h3 className="font-semibold">{column.title}</h3>
          </div>
          <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-sm font-medium">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <div 
        ref={setNodeRef}
        className={`min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver
            ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <SortableContext 
          items={leads.map(lead => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableItem
              key={lead.id}
              item={lead}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function SortableItem({ item, onDelete }: { item: ContactOrLead, onDelete?: (id: string) => Promise<void> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg rotate-2 opacity-50' : ''
      }`}
    >
      {/* Lead Card Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.email}
            </p>
            {item.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.phone}
              </p>
            )}
          </div>
        </div>

        {item.notes && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
            {item.notes}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(item.created_at)}</span>
          {item.source && (
            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {item.source}
            </span>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onDelete?.(item.id)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
            title="Delete lead"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DndKitPipelineBoard({ 
  contacts, 
  leads, 
  onContactUpdate, 
  onUpdateLead, 
  onUpdateContact, 
  onDeleteContact,
}: DndKitPipelineBoardProps) {
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, ContactOrLead[]>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  // Use either contacts or leads, prioritizing contacts
  const data = contacts || leads

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group leads by status
  useEffect(() => {
    if (!data) {
      console.log('DndKitPipelineBoard: data is undefined')
      setLeadsByStatus({})
      return
    }
    
    console.log('DndKitPipelineBoard: data changed', data.length)
    
    const grouped = data.reduce((acc, lead) => {
      const status = lead.status
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(lead)
      return acc
    }, {} as Record<string, ContactOrLead[]>)
    
    console.log('DndKitPipelineBoard: grouped leads', grouped)
    setLeadsByStatus(grouped)
  }, [data])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    console.log('🚀 Drag Start:', event.active.id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    console.log('🎯 Drag End:', { active: active.id, over: over?.id })

    if (!over) {
      console.log('❌ No destination, drag cancelled')
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Find the item being moved
    const activeItem = data?.find(item => item.id === activeId)
    if (!activeItem) {
      console.log('❌ Active item not found:', activeId)
      return
    }

    // The overId should now be the column ID (new, contacted, booked, completed)
    const newStatus = overId

    // Check if we're moving to a different column
    const currentStatus = activeItem.status

    if (currentStatus === newStatus) {
      console.log('❌ Same status, no change needed')
      return
    }

    console.log('📝 Updating status:', { activeId, from: currentStatus, to: newStatus })

    // Update the item status
    if (onUpdateLead && 'source' in activeItem) {
      // It's a lead
      await onUpdateLead(activeItem.id, { status: newStatus as Lead['status'] })
    } else if (onUpdateContact) {
      // It's a contact
      onUpdateContact(activeItem.id, { status: newStatus as Contact['status'] })
    } else if (onContactUpdate) {
      // Fallback to general update
      await onContactUpdate()
    }

    console.log('✅ Status updated successfully')
  }

  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No leads to display</p>
      </div>
    )
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => {
            const columnLeads = leadsByStatus[column.id] || []
            console.log(`Rendering column: ${column.id} with ${columnLeads.length} leads`)

            return (
              <DroppableColumn
                key={column.id}
                column={column}
                leads={columnLeads}
                onDelete={onDeleteContact}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              {data.find(item => item.id === activeId) && (
                <SortableItem
                  item={data.find(item => item.id === activeId)!}
                  onDelete={onDeleteContact}
                />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
