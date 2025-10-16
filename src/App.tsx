import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme } from './hooks/useTheme'
import ResponsiveLayout from './components/ResponsiveLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import SocialAutomation from './pages/SocialAutomation'
import Profile from './pages/Profile'
import BrandVoice from './pages/BrandVoice'
import LinkedInMain from './pages/LinkedInMain'
import LinkedInCallback from './pages/LinkedInCallback'
import Automations from './pages/Automations'
import PublicLeadCapture from './pages/PublicLeadCapture'
import Calendar from './pages/Calendar'
import Messages from './pages/Messages'
import Reviews from './pages/Reviews'
import ReviewCollection from './pages/ReviewCollection'
import ReferralLanding from './pages/ReferralLanding'
import Onboarding from './pages/Onboarding'
import NicheDemo from './pages/NicheDemo'
import AuthDebug from './pages/AuthDebug'
import Settings from './pages/Settings'
import AppStatus from './components/AppStatus'
import ErrorBoundary from './components/ErrorBoundary'
// Workflow engine is only used on server-side

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

  // Workflow engine is initialized on server-side only

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <AppStatus />
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/niche-demo" element={<NicheDemo />} />
              <Route path="/auth-debug" element={<AuthDebug />} />
          <Route path="/linkedin" element={<LinkedInMain />} />
          <Route path="/linkedin/callback" element={<LinkedInCallback />} />
          <Route path="/leads/:businessSlug" element={<PublicLeadCapture />} />
          <Route path="/review/:bookingId" element={<ReviewCollection />} />
          <Route path="/r/:referralCode" element={<ReferralLanding />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <ResponsiveLayout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/social-automation" element={<SocialAutomation />} />
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/brand-voice" element={<BrandVoice />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </ResponsiveLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
    </ErrorBoundary>
  )
}

export default App
