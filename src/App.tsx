import { Route, Routes } from 'react-router'
import Layout from './ui/shared/Layout'
import HomePage from './ui/player/HomePage'
import PlayerPage from './ui/player/PlayerPage'
import ComparePage from './ui/compare/ComparePage'
import GamesPage from './ui/games/GamesPage'
import CommunityPage from './ui/community/CommunityPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="player/:id" element={<PlayerPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="games/:game?" element={<GamesPage />} />
        <Route path="community" element={<CommunityPage />} />
      </Route>
    </Routes>
  )
}
