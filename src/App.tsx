import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { PeopleProvider } from './store/people'
import { ListScreen } from './screens/ListScreen'
import { DetailScreen } from './screens/DetailScreen'
import { EditScreen } from './screens/EditScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CompareScreen } from './screens/CompareScreen'
import { BattleScreen } from './screens/BattleScreen'
import { LiveBattleScreen } from './screens/LiveBattleScreen'
import { ChallengesScreen } from './screens/ChallengesScreen'
import { BadgesScreen } from './screens/BadgesScreen'
import { MeScreen } from './screens/MeScreen'
import { FriendsScreen } from './screens/FriendsScreen'
import { FriendProfileScreen } from './screens/FriendProfileScreen'
import { FriendPersonScreen } from './screens/FriendPersonScreen'
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
            <Route path="/battle" element={<BattleScreen />} />
            <Route path="/battle/live/:id" element={<LiveBattleScreen />} />
            <Route path="/challenges" element={<ChallengesScreen />} />
            <Route path="/badges" element={<BadgesScreen />} />
            <Route path="/me" element={<MeScreen />} />
            <Route path="/friends" element={<FriendsScreen />} />
            <Route path="/friends/:friendId" element={<FriendProfileScreen />} />
            <Route
              path="/friends/:friendId/person/:personId"
              element={<FriendPersonScreen />}
            />
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
