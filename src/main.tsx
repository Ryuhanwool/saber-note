import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import CheerProvider from './ui/cheer/CheerProvider'
import CommunityProvider from './ui/community/CommunityProvider'
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
              <App />
            </CheerProvider>
          </CommunityProvider>
        </LeagueProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
