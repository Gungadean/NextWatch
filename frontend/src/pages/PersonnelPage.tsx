/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * PersonnelPage.tsx
 *
 * Content page for displaying personnel page.
 */

const PERSONNEL = ['Test', 'Test2']

/**
 * Layout for personnel page.
 */
const PersonnelPage = () => {
  return (
    <div className="personnel-container">
      <div className="search-header">
        <button className="btn-adduser">Add User</button>
        <div>
          <input type="search" id="personnel-search" placeholder="Search Name"></input>
          <button className="btn-submit">Submit</button>
        </div>
      </div>

      <section className="user-results">
          <div className="header-row">
            <p>Index</p>
            <p>Name</p>
          </div>
          {PERSONNEL.map((element, index) => (
            <div className="result-row">
              <p className="column-index">{index}</p>
              <p className="column-name">{element}</p>
            </div>
          ))}
      </section>
    </div>
  )
};

export default PersonnelPage;