import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import CRM from './pages/CRM'
import BrandVoice from './pages/BrandVoice'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="crm" element={<CRM />} />
          <Route path="growth" element={<div className="p-6"><h1 className="text-2xl font-bold">Daily Growth - Coming Soon</h1></div>} />
          <Route path="brand" element={<BrandVoice />} />
          <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
