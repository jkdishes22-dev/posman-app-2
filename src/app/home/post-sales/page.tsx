"use client";

import SecureRoute from "../../components/SecureRoute";
import HomePageLayout from "../../shared/HomePageLayout";

const mySales = () => {
  return (
    <HomePageLayout>
      <SecureRoute roleRequired="user">
        <div className="container">
          <h1>Post dated sales</h1>
        </div>
      </SecureRoute>
    </HomePageLayout>
  );
};

export default mySales;
