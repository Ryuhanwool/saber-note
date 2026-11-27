import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import AuthProvider from './ui/auth/AuthProvider'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
import LineupProvider from './ui/lineup/LineupProvider'
import ProfileProvider from './ui/hub/ProfileProvider'
import MarketProvider from './ui/market/MarketProvider'
import SettingsProvider from './ui/settings/SettingsProvider'
import LeagueProvider from './ui/shared/LeagueProvider'
import './ui/shared/tokens.css'
import './ui/shared/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 하위 경로에 배포해도(예: GitHub Pages의 /saber-note/) 주소가 맞도록 빌드의 base를 따른다. 보통은 '/' */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SettingsProvider>
        <LeagueProvider>
          <AuthProvider>
            <CommunityProvider>
              <CheerProvider>
                <MarketProvider>
                  <LineupProvider>
                    <ProfileProvider>
                      <App />
                    </ProfileProvider>
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
