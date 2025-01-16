import React, { useState } from "react";
import SankeyDiagram from "./components/SankeyDiagram";
import HandTracking from "./components/HandTracking";
import OptimizedForceGraph from "./components/FDGraph";
import "./App.css";

const App = () => {
  const [isSankey, setIsSankey] = useState(true); // Toggle state to switch between components

  return (
    <div className="app-container">
      <div className="d-flex flex-column align-items-center">
        <button
          className="btn btn-primary mb-3"
          onClick={() => setIsSankey(!isSankey)} // Toggle the state on button click
        >
          {isSankey ? "Switch to Force Graph" : "Switch to Sankey Diagram"}
        </button>

        {isSankey ? (
          <HandTracking
            OverlayComponent={<SankeyDiagram fileName="/data.csv" width={854} height={480} />}
          />
        ) : (
          <HandTracking
            OverlayComponent={<OptimizedForceGraph fileName="/data.json" width={854} height={480} />}
          />
        )}
      </div>
    </div>
  );
};

export default App;