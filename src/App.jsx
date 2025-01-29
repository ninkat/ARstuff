import React, { useState } from "react";
import SankeyDiagram from "./components/SankeyDiagram";
import HandTracking from "./components/HandTracking";
import OptimizedForceGraph from "./components/FDGraph";
import Tilemap from "./components/Tilemap";
import "./App.css";

const App = () => {
  const [view, setView] = useState("sankey");

  return (
    <div className="app-container">
      <div className="d-flex flex-column align-items-center">
        <button
          className="btn btn-primary mb-3"
          onClick={() =>
            setView(view === "sankey" ? "force" : view === "force" ? "tilemap" : "sankey")
          }
        >
          {view === "sankey" ? "Switch to Force Graph" : view === "force" ? "Switch to Tilemap" : "Switch to Sankey Diagram"}
        </button>

        {view === "sankey" ? (
          <HandTracking
            OverlayComponent={<SankeyDiagram fileName="/data.csv" width={854} height={480} />}
          />
        ) : view === "force" ? (
          <HandTracking
            OverlayComponent={<OptimizedForceGraph fileName="/data.json" width={854} height={480} />}
          />
        ) : (
          <HandTracking
            OverlayComponent={<Tilemap />}
          />
        )}
      </div>
    </div>
  );
};

export default App;