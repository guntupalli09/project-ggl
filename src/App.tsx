import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme } from './hooks/useTheme'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import SocialAutomation from './pages/SocialAutomation'
import Profile from './pages/Profile'
import DailyGrowth from './pages/DailyGrowth'
import BrandVoice from './pages/BrandVoice'
import LinkedInMain from './pages/LinkedInMain'
import LinkedInCallback from './pages/LinkedInCallback'
import Leads from './pages/Leads'
import Automations from './pages/Automations'
import PublicLeadCapture from './pages/PublicLeadCapture'
import Calendar from './pages/Calendar'
import Messages from './pages/Messages'
import BusinessPerformance from './pages/BusinessPerformance'
import Reviews from './pages/Reviews'

function App() {
  const { theme } = useTheme()

  // Initialize theme on app load
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/linkedin" element={<LinkedInMain />} />
          <Route path="/linkedin/callback" element={<LinkedInCallback />} />
          <Route path="/leads/:businessSlug" element={<PublicLeadCapture />} />
          <Route path="/*" element={
            <div className="flex">
              <Sidebar isOpen={true} onClose={() => {}} />
              <main className="flex-1 ml-64">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/leads" element={<Leads />} />
                      <Route path="/crm" element={<CRM />} />
                      <Route path="/social-automation" element={<SocialAutomation />} />
                      <Route path="/automations" element={<Automations />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/business-performance" element={<BusinessPerformance />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route path="/daily-growth" element={<DailyGrowth />} />
                      <Route path="/brand-voice" element={<BrandVoice />} />
                    </Routes>
              </main>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
