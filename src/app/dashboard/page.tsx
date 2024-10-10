"use client"; // Ensure this component runs on the client side

import { useState } from "react";

import DashboardLayout from "../shared/DashboardLayout";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("active");

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };
  return (
    <DashboardLayout>
      <div className="container overflow-hidden">
        <div className="row gx-5">
          <div className="col-7">
            <div className="p-3 border bg-light">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "proteins" ? "active" : ""
                    }`}
                    onClick={() => handleTabClick("proteins")} // Change active tab
                    style={{ cursor: "pointer" }}
                  >
                    Proteins
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "starch" ? "active" : ""
                    }`}
                    onClick={() => handleTabClick("starch")} // Change active tab
                    style={{ cursor: "pointer" }}
                  >
                    Starch
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "hot-beverages" ? "active" : ""
                    }`}
                    onClick={() => handleTabClick("hot-beverages")} // Change active tab
                    style={{ cursor: "pointer" }}
                  >
                    Hot Beverages
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "soft-drinks" ? "active" : ""
                    }`}
                    onClick={() => handleTabClick("soft-drinks")} // Change active tab
                    style={{ cursor: "pointer" }}
                  >
                    Soft Drinks
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${
                      activeTab === "vegetarian" ? "active" : ""
                    }`}
                    onClick={() => handleTabClick("vegetarian")} // Change active tab
                    style={{ cursor: "pointer" }}
                  >
                    Vegetarian
                  </a>
                </li>
              </ul>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === "proteins" && (
                  <div>
                    {" "}
                    <div className="col-7 mt-5">
                      <div className="row">
                        <div className="col-sm-3">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Chicken</h5>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Beef</h5>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Fish</h5>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="card">
                            <div className="card-body">
                              <h5 className="card-title">Fish</h5>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "starch" && <div>Content for Starch Tab</div>}
                {activeTab === "hot-beverages" && (
                  <div>Content for Hot Beverages Tab</div>
                )}
                {activeTab === "soft-drinks" && (
                  <div>Content for Soft Drinks Tab</div>
                )}
                {activeTab === "vegetarian" && (
                  <div>Content for Vegetarian Tab</div>
                )}
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
                <div className="col-sm-4">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Soda</h5>
                    </div>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Soda</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row mt-4">
                <div className="col-sm-4">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Chapati</h5>
                    </div>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Soda</h5>
                    </div>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Soda</h5>
                    </div>
                  </div>
                </div>
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
                  <tr>
                    <th scope="row">2</th>
                    <td>Jacob</td>
                    <td>Thornton</td>
                    <td>@fat</td>
                  </tr>
                  <tr>
                    <th scope="row">3</th>
                    <td colSpan={2}>Larry the Bird</td>
                    <td>@twitter</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
