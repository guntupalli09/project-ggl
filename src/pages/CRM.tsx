import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import PipelineBoard from '../components/PipelineBoard'
import AISequenceGenerator from '../components/AISequenceGenerator'
import * as XLSX from 'xlsx'

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

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    status: 'Prospect' as Contact['status'],
    notes: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid')
  const [activeTab, setActiveTab] = useState<'contacts' | 'sequences'>('contacts')
  const [showSequenceModal, setShowSequenceModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Fetch contacts
  const fetchContacts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching contacts:', error)
        setError('Failed to fetch contacts')
      } else {
        setContacts(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchContacts()
    }
  }, [user])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    if (!user) {
      setError('User not authenticated')
      setSubmitting(false)
      return
    }

    try {
      const contactData = {
        ...formData,
        user_id: user.id
      }

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('crm_contacts')
          .update(contactData)
          .eq('id', editingContact.id)

        if (error) {
          console.error('Error updating contact:', error)
          setError('Failed to update contact')
        } else {
          setEditingContact(null)
          resetForm()
          fetchContacts()
        }
      } else {
        // Create new contact
        const { error } = await supabase
          .from('crm_contacts')
          .insert([contactData])

        if (error) {
          console.error('Error creating contact:', error)
          setError('Failed to create contact')
        } else {
          resetForm()
          fetchContacts()
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting contact:', error)
        setError('Failed to delete contact')
      } else {
        fetchContacts()
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to delete contact')
    }
  }

  // Handle edit
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      company: contact.company,
      email: contact.email,
      status: contact.status,
      notes: contact.notes
    })
    setShowForm(true)
  }

  // Handle generate sequence
  const handleGenerateSequence = (contact: Contact) => {
    setSelectedContact(contact)
    setShowSequenceModal(true)
  }

  // Handle close sequence modal
  const handleCloseSequenceModal = () => {
    setShowSequenceModal(false)
    setSelectedContact(null)
  }

  // Handle export to Google Sheets
  const handleExportToSheets = () => {
    try {
      // Prepare data for export
      const exportData = contacts.map(contact => ({
        'Name': contact.name,
        'Company': contact.company,
        'Email': contact.email,
        'Status': contact.status,
        'Notes': contact.notes || '',
        'Created Date': new Date(contact.created_at).toLocaleDateString(),
        'Last Updated': new Date(contact.updated_at).toLocaleDateString()
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 25 }, // Company
        { wch: 30 }, // Email
        { wch: 15 }, // Status
        { wch: 40 }, // Notes
        { wch: 12 }, // Created Date
        { wch: 12 }  // Last Updated
      ]
      ws['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'CRM Contacts')

      // Generate filename with current date
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]
      const filename = `CRM_Contacts_${dateStr}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      // Show success message
      alert(`Successfully exported ${contacts.length} contacts to ${filename}`)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      status: 'Prospect',
      notes: ''
    })
    setEditingContact(null)
    setShowForm(false)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Get status color
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">CRM System</h1>
                <p className="mt-2 text-gray-600">Manage your customer relationships and outreach</p>
              </div>
              <div className="flex items-center space-x-4">
                {activeTab === 'contacts' && (
                  <>
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Grid View
                      </button>
                      <button
                        onClick={() => setViewMode('pipeline')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'pipeline'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Pipeline View
                      </button>
                    </div>
                    <button
                      onClick={handleExportToSheets}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to Excel
                    </button>
                    <button
                      onClick={() => setShowForm(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Add Contact
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'contacts'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Contacts
                  </button>
                  <button
                    onClick={() => setActiveTab('sequences')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'sequences'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    AI Sequences
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'contacts' ? (
            <>
              {/* Contact Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingContact ? 'Edit Contact' : 'Add New Contact'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                        Company *
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.company}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.notes}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {submitting ? 'Saving...' : (editingContact ? 'Update' : 'Create')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Sequence Generation Modal */}
          {showSequenceModal && selectedContact && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <AISequenceGenerator
                  contact={selectedContact}
                  onClose={handleCloseSequenceModal}
                  onSequenceGenerated={() => {
                    handleCloseSequenceModal()
                    // Optionally refresh data or show success message
                  }}
                />
              </div>
            </div>
          )}

          {/* Contacts Display */}
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new contact.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add Contact
                </button>
              </div>
            </div>
          ) : viewMode === 'pipeline' ? (
            <PipelineBoard
              contacts={contacts}
              onContactUpdate={fetchContacts}
              onEditContact={handleEdit}
              onDeleteContact={handleDelete}
              onGenerateSequence={handleGenerateSequence}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {contact.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {contact.company}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {contact.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                        {contact.status}
                      </span>
                    </div>

                    {contact.notes && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {contact.notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                      <p className="text-xs text-gray-400">
                        Updated {new Date(contact.updated_at).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGenerateSequence(contact)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Generate Sequence
                        </button>
                        <button
                          onClick={() => handleEdit(contact)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          ) : (
            <AISequenceGenerator />
          )}
        </div>
      </div>
    </div>
  )
}
