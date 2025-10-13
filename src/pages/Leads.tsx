import React, { useState } from 'react'
import { useLeads, Lead } from '../hooks/useLeads'
import AIMessageGenerator from '../components/AIMessageGenerator'
import PipelineBoard from '../components/PipelineBoard'
import ResponseTracker from '../components/ResponseTracker'
import BookingIntegration from '../components/BookingIntegration'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EnvelopeIcon,
  PhoneIcon,
  TableCellsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'

const Leads: React.FC = () => {
  const { leads, loading, error, addLead, updateLead, deleteLead } = useLeads()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    status: 'new' as Lead['status'],
    notes: ''
  })

  const statusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    responded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    no_response: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    booked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLead) {
        await updateLead(editingLead.id, formData)
        setEditingLead(null)
      } else {
        await addLead(formData)
      }
      setFormData({ name: '', email: '', phone: '', source: '', status: 'new', notes: '' })
      setShowAddForm(false)
    } catch (err) {
      console.error('Error saving lead:', err)
    }
  }

  const handleEdit = (lead: any) => {
    setEditingLead(lead)
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || '',
      status: lead.status,
      notes: lead.notes || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead(id)
      } catch (err) {
        console.error('Error deleting lead:', err)
      }
    }
  }

  const handleStatusChange = async (lead: Lead, newStatus: Lead['status']) => {
    try {
      await updateLead(lead.id, { status: newStatus })
    } catch (err) {
      console.error('Error updating lead status:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <PageHeader
          title="Leads Management"
          subtitle="Track and manage your leads throughout the sales process"
          actions={
            <Button
              onClick={() => setShowAddForm(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Lead
            </Button>
          }
        />

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Leads ({leads.length})</CardTitle>
              <div className="flex items-center space-x-4">
                {/* View Toggle */}
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'pipeline')} defaultValue="table">
                  <TabsList variant="pills">
                    <TabsTrigger value="table" className="flex items-center">
                      <TableCellsIcon className="h-4 w-4 mr-1" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="pipeline" className="flex items-center">
                      <Squares2X2Icon className="h-4 w-4 mr-1" />
                      Pipeline
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {leads.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <EnvelopeIcon className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No leads yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get started by adding your first lead
                </p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Add Your First Lead
                </Button>
              </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {leads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {lead.name}
                            </div>
                            {lead.notes && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {lead.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {lead.source || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead, e.target.value as Lead['status'])}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="responded">Responded</option>
                            <option value="no_response">No Response</option>
                            <option value="booked">Booked</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <ResponseTracker
                            leadId={lead.id}
                            currentStatus={lead.status}
                            onStatusUpdate={() => {
                              // Refresh leads data
                              window.location.reload()
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <BookingIntegration
                              leadId={lead.id}
                              leadName={lead.name}
                              leadEmail={lead.email}
                              onBookingCreated={() => {
                                // Refresh leads when booking is created
                                window.location.reload()
                              }}
                            />
                            <button
                              onClick={() => handleEdit(lead)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            leads && leads.length > 0 ? (
              <PipelineBoard 
                contacts={leads} 
                onContactUpdate={async () => {
                  // Refresh leads data
                  window.location.reload()
                }} 
                onEditContact={handleEdit} 
                onDeleteContact={handleDelete} 
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No leads to display</p>
              </div>
            )
          )}
          </CardContent>
        </Card>

        {/* Add/Edit Lead Modal */}
        <Modal
          isOpen={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingLead(null)
            setFormData({ name: '', email: '', phone: '', source: '', status: 'new', notes: '' })
          }}
          title={editingLead ? 'Edit Lead' : 'Add New Lead'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <Input
              type="tel"
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            
            <Input
              type="text"
              label="Source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., Website, Referral, Social Media"
            />
            
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Lead['status'] })}
              options={[
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'booked', label: 'Booked' },
                { value: 'completed', label: 'Completed' }
              ]}
            />
            
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingLead(null)
                  setFormData({ name: '', email: '', phone: '', source: '', status: 'new', notes: '' })
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingLead ? 'Update Lead' : 'Add Lead'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* AI Message Generator Section */}
        <div className="mt-8">
          <PageHeader
            title="AI Message Generator"
            subtitle="Generate AI-powered follow-up messages for your leads. Add a lead with an email address above to see the 'Send Email' button."
          />
          <Card>
            <CardContent>
              {/* Demo with sample data */}
              <AIMessageGenerator 
                leadName="John Doe"
                leadCompany="Acme Corp"
                leadEmail="john@acme.com"
                leadId="demo-lead-id"
                onMessageGenerated={(message) => console.log('Generated message:', message)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Leads