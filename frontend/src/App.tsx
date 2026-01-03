import './App.css'
import {BrowserRouter, Route, Routes} from 'react-router';
import AppLayout from './layouts/AppLayout.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import BuilderPage from './pages/BuilderPage.tsx';
import RequestPage from './pages/RequestPage.tsx';
import PersonnelPage from './pages/PersonnelPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';

const App = () => {
  return (
      <BrowserRouter>
        <Routes >
          <Route element={<AppLayout />}>
            <Route index element={<CalendarPage />} />
            <Route path="builder" element={<BuilderPage />} />
            <Route path="requests" element={<RequestPage />} />
            <Route path="personnel" element={<PersonnelPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
  )
};

export default App;
