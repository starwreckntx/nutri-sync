import { Routes, Route, Navigate } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import AppLayout from '@/components/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Baseline from '@/pages/Baseline'
import Goals from '@/pages/Goals'
import Connectors from '@/pages/Connectors'

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="baseline" element={<Baseline />} />
          <Route path="goals" element={<Goals />} />
          <Route path="connectors" element={<Connectors />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors />
    </>
  )
}
