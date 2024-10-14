import React from "react";

const BillingSection = ({ activeTab, handleTabClick }) => {
  return (
    <div className="container overflow-hidden">
      <div className="row gx-5">
        <div className="col-7">
          <div className="p-3 border bg-light">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "proteins" ? "active" : ""}`}
                  onClick={() => handleTabClick("proteins")}
                  style={{ cursor: "pointer" }}
                >
                  Proteins
                </a>
              </li>
              {/* Add other tabs similarly */}
            </ul>
            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === "proteins" && (
                <div>
                  <div className="col-7 mt-5">
                    <div className="row">
                      <div className="col-sm-3">
                        <div className="card">
                          <div className="card-body">
                            <h5 className="card-title">Chicken</h5>
                          </div>
                        </div>
                      </div>
                      {/* Add other card components similarly */}
                    </div>
                  </div>
                </div>
              )}
              {/* Add content for other tabs similarly */}
            </div>
          </div>
          <div className="col-7 mt-5">
            Favourites
            <div className="row mt-4">
              <div className="col-sm-4">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Chapati</h5>
                  </div>
                </div>
              </div>
              {/* Add other favourite items similarly */}
            </div>
          </div>
        </div>
        <div className="col-5">
          <div className="p-3 border bg-light">
            Billing section
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">First</th>
                  <th scope="col">Last</th>
                  <th scope="col">Handle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1</th>
                  <td>Mark</td>
                  <td>Otto</td>
                  <td>@mdo</td>
                </tr>
                {/* Add other billing rows similarly */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BillingSection;
