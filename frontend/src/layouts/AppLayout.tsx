import { Outlet } from 'react-router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../App.css'

const AppLayout = () => {
  return (
    <div className="app-container">
      <aside className="sidebar-container">
        <Sidebar />
      </aside>

      <div className="main-content">
        <header className="top-header">
          <Header />
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
};

export default AppLayout;