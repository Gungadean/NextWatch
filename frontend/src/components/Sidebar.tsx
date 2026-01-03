import { NavLink } from "react-router";
import './Sidebar.css'

const Sidebar = () => {
  return (
    <div>
      <div className="sidebar-logo">NextWatch</div>

      <nav>
        <ul className="nav-list">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              Dashboard</NavLink>
          </li>

          <li>
            <NavLink
              to="builder"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              Schedule Builder</NavLink>
          </li>

          <li>
            <NavLink
              to="requests"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              Leave Requests</NavLink>
          </li>

          <li>
            <NavLink
              to="personnel"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              Personnel</NavLink>
          </li>

          <li>
            <NavLink
              to="settings"
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              Settings</NavLink>
          </li>

        </ul>
      </nav>
  </div>
  )
};

export default Sidebar;