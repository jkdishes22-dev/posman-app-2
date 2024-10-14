"use client";

import SecureRoute from "../../components/SecureRoute";
import HomePageLayout from "../../shared/HomePageLayout";

const mySales = () => {
  return (
    <HomePageLayout>
      <SecureRoute roleRequired="user">
        <div className="container">
          <h1>My Sales</h1>
        </div>
      </SecureRoute>
    </HomePageLayout>
  );
};

export default mySales;
