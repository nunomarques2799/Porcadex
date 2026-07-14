import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { PeopleProvider } from './store/people'
import { ListScreen } from './screens/ListScreen'
import { DetailScreen } from './screens/DetailScreen'
import { EditScreen } from './screens/EditScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CompareScreen } from './screens/CompareScreen'
import { BadgesScreen } from './screens/BadgesScreen'
import { MeScreen } from './screens/MeScreen'
import { AuthScreen, SetupScreen } from './screens/AuthScreen'

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { ready, loading, user } = useAuth()

  if (!ready) return <SetupScreen />
  if (loading) return <SplashScreen />
  if (!user) return <AuthScreen />

  return (
    <PeopleProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ListScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/compare" element={<CompareScreen />} />
            <Route path="/badges" element={<BadgesScreen />} />
            <Route path="/me" element={<MeScreen />} />
            <Route path="/add" element={<EditScreen />} />
            <Route path="/person/:id" element={<DetailScreen />} />
            <Route path="/person/:id/edit" element={<EditScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </PeopleProvider>
  )
}

function SplashScreen() {
  return (
    <div className="auth">
      <div className="auth__card auth__card--slim">
        <span className="logo-ball logo-ball--lg" aria-hidden="true" />
        <p>A carregar…</p>
      </div>
    </div>
  )
}
