import React from "react";
import SankeyDiagram from "./components/SankeyDiagram";
import HandTracking from "./components/HandTracking";
import "./App.css";

const App = () => {
  return (
    <div className="app-container">
      <HandTracking OverlayComponent={<SankeyDiagram fileName="/data.csv" width={1280} height={720} />} />
    </div>
  );
};

export default App;