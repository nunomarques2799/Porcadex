import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PeopleProvider } from './store/people'
import { ListScreen } from './screens/ListScreen'
import { DetailScreen } from './screens/DetailScreen'
import { EditScreen } from './screens/EditScreen'

export default function App() {
  return (
    <PeopleProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ListScreen />} />
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
