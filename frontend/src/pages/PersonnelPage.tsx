import './Personnel.css';

const PERSONNEL = ['Test', 'Test2']

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