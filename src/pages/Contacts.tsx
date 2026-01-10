import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser } from '../lib/authUtils'
import { useAuth } from '../hooks/useAuth'
import { useLeads, Lead } from '../hooks/useLeads'
import AIMessageGenerator from '../components/AIMessageGenerator'
import DndKitCombinedPipelineBoard from '../components/DndKitCombinedPipelineBoard'
import BookingIntegration from '../components/BookingIntegration'
import AISequenceGenerator from '../components/AISequenceGenerator'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import * as XLSX from 'xlsx'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EnvelopeIcon,
  TableCellsIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

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

const STATUS_OPTIONS = ['Prospect', 'Contacted', 'In Progress', 'Closed'] as const

export default function Contacts() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [, setIsGuest] = useState(false)
  const [activeTab, setActiveTab] = useState('leads')
  
  // Leads functionality
  const { leads, loading: leadsLoading, addLead, updateLead, deleteLead } = useLeads()
  const [showAddLeadForm, setShowAddLeadForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [leadViewMode, setLeadViewMode] = useState<'table' | 'pipeline'>('table')
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    status: 'new' as Lead['status'],
    notes: ''
  })

  // CRM functionality
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [showAddContactForm, setShowAddContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactViewMode, setContactViewMode] = useState<'grid' | 'pipeline'>('grid')
  const [contactFormData, setContactFormData] = useState({
    name: '',
    company: '',
    email: '',
    status: 'Prospect' as Contact['status'],
    notes: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Lead status colors
  const leadStatusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    responded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    no_response: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    booked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
  }

  // Contact status colors
  const contactStatusColors = {
    Prospect: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'In Progress': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  // Initialize
  useEffect(() => {
    const initializeData = async () => {
      setIsGuest(isGuestUser())
      setLoading(false)
      
      if (!user) {
        return
      }

      // Fetch contacts
      await fetchContacts()
    }

    initializeData()
  }, [user])

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setContactsLoading(true)
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching contacts:', error)
        setError('Failed to fetch contacts')
        return
      }

      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setError('Failed to fetch contacts')
    } finally {
      setContactsLoading(false)
    }
  }

  // Lead form handlers
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLead) {
        await updateLead(editingLead.id, leadFormData)
        setEditingLead(null)
      } else {
        await addLead(leadFormData)
      }
      setLeadFormData({
        name: '',
        email: '',
        phone: '',
        source: '',
        status: 'new',
        notes: ''
      })
      setShowAddLeadForm(false)
    } catch (error) {
      console.error('Error saving lead:', error)
    }
  }

  const handleLeadEdit = (lead: Lead) => {
    setEditingLead(lead)
    setLeadFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || '',
      status: lead.status,
      notes: lead.notes || ''
    })
    setShowAddLeadForm(true)
  }

  const handleLeadDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead(id)
      } catch (error) {
        console.error('Error deleting lead:', error)
      }
    }
  }

  // Contact form handlers
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: contactFormData.name,
            company: contactFormData.company,
            email: contactFormData.email,
            status: contactFormData.status,
            notes: contactFormData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id)

        if (error) throw error

        setContacts(contacts.map(contact => 
          contact.id === editingContact.id 
            ? { ...contact, ...contactFormData, updated_at: new Date().toISOString() }
            : contact
        ))
        setEditingContact(null)
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: user?.id,
            name: contactFormData.name,
            company: contactFormData.company,
            email: contactFormData.email,
            status: contactFormData.status,
            notes: contactFormData.notes
          })
          .select()

        if (error) throw error

        setContacts([data[0], ...contacts])
      }

      setContactFormData({
        name: '',
        company: '',
        email: '',
        status: 'Prospect',
        notes: ''
      })
      setShowAddContactForm(false)
    } catch (error) {
      console.error('Error saving contact:', error)
      setError('Failed to save contact')
    } finally {
      setSubmitting(false)
    }
  }

  const handleContactEdit = (contact: Contact) => {
    setEditingContact(contact)
    setContactFormData({
      name: contact.name,
      company: contact.company,
      email: contact.email,
      status: contact.status,
      notes: contact.notes
    })
    setShowAddContactForm(true)
  }

  const handleContactDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        const { error } = await supabase
          .from('contacts')
          .delete()
          .eq('id', id)

        if (error) throw error

        setContacts(contacts.filter(contact => contact.id !== id))
      } catch (error) {
        console.error('Error deleting contact:', error)
        setError('Failed to delete contact')
      }
    }
  }

  // Export functionality
  const handleExportContacts = () => {
    const data = contacts.map(contact => ({
      Name: contact.name,
      Company: contact.company,
      Email: contact.email,
      Status: contact.status,
      Notes: contact.notes,
      'Created At': new Date(contact.created_at).toLocaleDateString()
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, 'contacts.xlsx')
  }

  const handleExportLeads = () => {
    const data = leads.map(lead => ({
      Name: lead.name,
      Email: lead.email,
      Phone: lead.phone,
      Source: lead.source,
      Status: lead.status,
      Notes: lead.notes,
      'Created At': new Date(lead.created_at).toLocaleDateString()
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, 'leads.xlsx')
  }

  if (loading) {
    return (
      <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper 
      title="Contacts" 
      description="Manage your leads and customer relationships"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center">
          <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Contact Management</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Welcome, {user?.email}
          </span>
        </div>
      </div>

      <div className="space-y-6">
          
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex overflow-x-auto" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'leads'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Leads
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-2.5 rounded-full text-xs">
                    {leads.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'contacts'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  All Contacts
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0.5 px-2.5 rounded-full text-xs">
                    {contacts.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'pipeline'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Pipeline
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              {/* Leads Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h2>
                  <p className="text-gray-600 dark:text-gray-400">Manage your incoming leads and track their progress</p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setLeadViewMode(leadViewMode === 'table' ? 'pipeline' : 'table')}
                    variant="outline"
                  >
                    {leadViewMode === 'table' ? (
                      <>
                        <Squares2X2Icon className="h-4 w-4 mr-2" />
                        Pipeline View
                      </>
                    ) : (
                      <>
                        <TableCellsIcon className="h-4 w-4 mr-2" />
                        Table View
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowAddLeadForm(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Lead
                  </Button>
                  <Button onClick={handleExportLeads} variant="outline">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Leads Content */}
              {leadViewMode === 'table' ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Source</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {leadsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              Loading leads...
                            </td>
                          </tr>
                        ) : leads.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              No leads found. Add your first lead to get started.
                            </td>
                          </tr>
                        ) : (
                          leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{lead.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500 dark:text-gray-400">{lead.source}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${leadStatusColors[lead.status]}`}>
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleLeadEdit(lead)}
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleLeadDelete(lead.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Lead Pipeline
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop leads between stages to update their status
                    </p>
                  </div>
                  <DndKitCombinedPipelineBoard 
                    leads={leads} 
                    contacts={[]} 
                    onUpdateLead={updateLead} 
                    onUpdateContact={() => {}}
                    showContactsPipeline={false}
                  />
                </div>
              )}

              {/* AI Message Generator */}
              <AIMessageGenerator />

              {/* Response Tracker - Only show if there are leads */}
              {leads.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Response Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the pipeline view to track responses for individual leads.
                  </p>
                </div>
              )}

              {/* Booking Integration */}
              <BookingIntegration 
                leadId=""
                leadName=""
                leadEmail=""
              />
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {/* Contacts Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Contacts</h2>
                  <p className="text-gray-600 dark:text-gray-400">Manage your complete contact database</p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setContactViewMode(contactViewMode === 'grid' ? 'pipeline' : 'grid')}
                    variant="outline"
                  >
                    {contactViewMode === 'grid' ? (
                      <>
                        <Squares2X2Icon className="h-4 w-4 mr-2" />
                        Pipeline View
                      </>
                    ) : (
                      <>
                        <TableCellsIcon className="h-4 w-4 mr-2" />
                        Grid View
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowAddContactForm(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                  <Button onClick={handleExportContacts} variant="outline">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Contacts Content */}
              {contactViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contactsLoading ? (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                      Loading contacts...
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                      No contacts found. Add your first contact to get started.
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{contact.name}</CardTitle>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.company}</p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contactStatusColors[contact.status]}`}>
                              {contact.status}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <EnvelopeIcon className="h-4 w-4 mr-2" />
                              {contact.email}
                            </div>
                            {contact.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{contact.notes}</p>
                            )}
                          </div>
                          <div className="mt-4 flex justify-end space-x-2">
                            <button
                              onClick={() => handleContactEdit(contact)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleContactDelete(contact.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Contacts Pipeline
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop contacts between stages to update their status
                    </p>
                  </div>
                  <DndKitCombinedPipelineBoard 
                    leads={[]} 
                    contacts={contacts} 
                    onUpdateLead={async () => {}}
                    onUpdateContact={async (id, updates) => {
                      try {
                        const { error } = await supabase
                          .from('contacts')
                          .update({
                            ...updates,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', id)

                        if (error) throw error

                        setContacts(contacts.map(contact => 
                          contact.id === id ? { ...contact, ...updates, updated_at: new Date().toISOString() } : contact
                        ))
                      } catch (error) {
                        console.error('Error updating contact:', error)
                        setError('Failed to update contact')
                      }
                    }}
                    showLeadsPipeline={false}
                  />
                </div>
              )}

              {/* AI Sequence Generator */}
              <AISequenceGenerator />
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Pipeline</h2>
                  <p className="text-gray-600 dark:text-gray-400">Visualize your sales process and track progress</p>
                </div>
              </div>

              {/* Combined Pipeline View - Show both leads and contacts in one unified pipeline */}
              <div className="space-y-6">
                {/* Leads Pipeline */}
                {leads.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leads Pipeline</h3>
                    <DndKitCombinedPipelineBoard 
                      leads={leads} 
                      contacts={[]} 
                      onUpdateLead={updateLead} 
                      onUpdateContact={() => {}}
                      showContactsPipeline={false}
                    />
                  </div>
                )}

                {/* Contacts Pipeline */}
                {contacts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contacts Pipeline</h3>
                    <DndKitCombinedPipelineBoard 
                      leads={[]} 
                      contacts={contacts} 
                      onUpdateLead={async () => {}}
                      onUpdateContact={async (id, updates) => {
                        try {
                          const { error } = await supabase
                            .from('contacts')
                            .update({
                              ...updates,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', id)

                          if (error) throw error

                          setContacts(contacts.map(contact => 
                            contact.id === id ? { ...contact, ...updates, updated_at: new Date().toISOString() } : contact
                          ))
                        } catch (error) {
                          console.error('Error updating contact:', error)
                          setError('Failed to update contact')
                        }
                      }}
                      showLeadsPipeline={false}
                    />
                  </div>
                )}

                {/* Show message if no data */}
                {leads.length === 0 && contacts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 dark:text-gray-500 mb-4">
                      <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No pipeline data
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add some leads or contacts to see them in your pipeline
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Lead Modal */}
          <Modal
            isOpen={showAddLeadForm}
            onClose={() => {
              setShowAddLeadForm(false)
              setEditingLead(null)
              setLeadFormData({
                name: '',
                email: '',
                phone: '',
                source: '',
                status: 'new',
                notes: ''
              })
            }}
            title={editingLead ? 'Edit Lead' : 'Add New Lead'}
          >
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <Input
                  type="text"
                  value={leadFormData.name}
                  onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={leadFormData.email}
                  onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={leadFormData.phone}
                  onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source
                </label>
                <Input
                  type="text"
                  value={leadFormData.source}
                  onChange={(e) => setLeadFormData({ ...leadFormData, source: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Select
                  value={leadFormData.status}
                  onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value as Lead['status'] })}
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'responded', label: 'Responded' },
                    { value: 'no_response', label: 'No Response' },
                    { value: 'booked', label: 'Booked' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <Textarea
                  value={leadFormData.notes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddLeadForm(false)
                    setEditingLead(null)
                    setLeadFormData({
                      name: '',
                      email: '',
                      phone: '',
                      source: '',
                      status: 'new',
                      notes: ''
                    })
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

          {/* Add Contact Modal */}
          <Modal
            isOpen={showAddContactForm}
            onClose={() => {
              setShowAddContactForm(false)
              setEditingContact(null)
              setContactFormData({
                name: '',
                company: '',
                email: '',
                status: 'Prospect',
                notes: ''
              })
            }}
            title={editingContact ? 'Edit Contact' : 'Add New Contact'}
          >
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <Input
                  type="text"
                  value={contactFormData.name}
                  onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <Input
                  type="text"
                  value={contactFormData.company}
                  onChange={(e) => setContactFormData({ ...contactFormData, company: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Select
                  value={contactFormData.status}
                  onChange={(e) => setContactFormData({ ...contactFormData, status: e.target.value as Contact['status'] })}
                  options={STATUS_OPTIONS.map(status => ({ value: status, label: status }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <Textarea
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddContactForm(false)
                    setEditingContact(null)
                    setContactFormData({
                      name: '',
                      company: '',
                      email: '',
                      status: 'Prospect',
                      notes: ''
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Error Alert */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </div>
    </ResponsivePageWrapper>
  )
}
