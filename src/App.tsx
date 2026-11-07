import { Route, Routes } from 'react-router'
import Layout from './ui/shared/Layout'
import HomePage from './ui/player/HomePage'
import PlayerPage from './ui/player/PlayerPage'
import ComparePage from './ui/compare/ComparePage'
import GamesPage from './ui/games/GamesPage'
import CommunityPage from './ui/community/CommunityPage'
import CheerRoomPage from './ui/cheer/CheerRoomPage'
import CartPage from './ui/market/CartPage'
import CheckoutPage from './ui/market/CheckoutPage'
import FanMarketPage from './ui/market/FanMarketPage'
import ListingPage from './ui/market/ListingPage'
import SellPage from './ui/market/SellPage'
import StorePage from './ui/market/StorePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="player/:id" element={<PlayerPage />} />
        <Route path="player/:id/cheer" element={<CheerRoomPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="games/:game?" element={<GamesPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="market" element={<StorePage />} />
        <Route path="market/fan" element={<FanMarketPage />} />
        <Route path="market/fan/:id" element={<ListingPage />} />
        <Route path="market/sell" element={<SellPage />} />
        <Route path="market/cart" element={<CartPage />} />
        <Route path="market/checkout" element={<CheckoutPage />} />
      </Route>
    </Routes>
  )
}
