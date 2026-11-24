import React from 'react'
import AppShell from './app/AppShell.jsx'
import { useHashRoute } from './hooks/useHashRoute.js'
import { ToastProvider } from './components/Toast.jsx'
import { PlannerSettingsProvider } from './hooks/usePlannerSettings.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CreatePage from './pages/CreatePage.jsx'
import PreviewPage from './pages/PreviewPage.jsx'
import GeneratePage from './pages/GeneratePage.jsx'
import ListingPage from './pages/ListingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ComponentsPage from './pages/ComponentsPage.jsx'

const PAGES = {
  dashboard: DashboardPage, create: CreatePage, preview: PreviewPage,
  generate: GeneratePage, listing: ListingPage, settings: SettingsPage,
  components: ComponentsPage, // 숨은 확인용 화면
}

export default function App() {
  const path = useHashRoute()
  const Page = PAGES[path]
  const statusText = window.planner ? '데스크톱 모드' : '개발 중 · 4단계'
  return (
    <ToastProvider>
      <PlannerSettingsProvider>
        <AppShell current={path} statusText={statusText}><Page /></AppShell>
      </PlannerSettingsProvider>
    </ToastProvider>
  )
}
