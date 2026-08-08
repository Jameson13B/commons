import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { RequireRole } from '@/components/guards/RequireRole'
import { AppShell } from '@/components/layout/AppShell'
import { PhoneLogin } from '@/features/auth/PhoneLogin'
import { Onboarding } from '@/features/auth/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { Admin } from '@/pages/Admin'
import { Profile } from '@/pages/Profile'
import { Directory } from '@/pages/Directory'
import { Announcements } from '@/pages/Announcements'
import { Events } from '@/pages/Events'
import { ModulePage } from '@/pages/ModulePage'
import { NotFound } from '@/pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PhoneLogin />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<RequireRole minRole="member" />}>
            <Route path="/m/directory" element={<Directory />} />
            <Route path="/m/announcements" element={<Announcements />} />
            <Route path="/m/events" element={<Events />} />
          </Route>
          <Route path="/m/:moduleId" element={<ModulePage />} />
          <Route element={<RequireRole minRole="admin" />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
