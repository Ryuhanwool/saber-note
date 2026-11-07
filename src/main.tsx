import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'
import './ui/shared/tokens.css'
import './ui/shared/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <LeagueProvider>
          <CommunityProvider>
            <CheerProvider>
              <MarketProvider>
                <App />
              </MarketProvider>
            </CheerProvider>
          </CommunityProvider>
        </LeagueProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
