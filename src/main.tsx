import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import LineupProvider from './ui/lineup/LineupProvider'
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
          <AuthProvider>
            <CommunityProvider>
              <CheerProvider>
                <MarketProvider>
                  <LineupProvider>
                    <App />
                  </LineupProvider>
                </MarketProvider>
              </CheerProvider>
            </CommunityProvider>
          </AuthProvider>
        </LeagueProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
