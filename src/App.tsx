import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PeopleProvider } from './store/people'
import { ListScreen } from './screens/ListScreen'
import { DetailScreen } from './screens/DetailScreen'
import { EditScreen } from './screens/EditScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CompareScreen } from './screens/CompareScreen'
import { BadgesScreen } from './screens/BadgesScreen'

export default function App() {
  return (
    <PeopleProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ListScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/compare" element={<CompareScreen />} />
            <Route path="/badges" element={<BadgesScreen />} />
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
