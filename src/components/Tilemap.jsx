import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const Tilemap = () => {
  const svgRef = useRef(null);

  const stateIdToAbbreviation = {
    "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID",
    "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA",
    "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ",
    "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK",
    "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN",
    "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY", "01": "AL", "02": "AK", "04": "AZ", "05": "AR",
    "06": "CA", "08": "CO", "09": "CT"
  };

  useEffect(() => {
    fetch("/tiles.topo.json")
      .then((response) => response.json())
      .then((tilesData) => {
        const states = topojson.feature(tilesData, tilesData.objects.tiles).features;

        const width = 960;
        const height = 600;

        const projection = d3.geoIdentity()
          .reflectY(true)
          .fitSize([width, height], { type: "FeatureCollection", features: states });

        const path = d3.geoPath(projection);

        const svg = d3.select(svgRef.current)
          .attr("width", width)
          .attr("height", height);

        // Color scheme
        const baseColor = "rgba(60, 180, 75, 0.4)"; // Greenish - Unhovered & Unhighlighted
        const hoverColor = "rgba(255, 165, 0, 0.6)"; // Orange - Hovered & Unhighlighted
        const selectedColor = "rgba(220, 20, 60, 0.8)"; // Crimson - Unhovered & Highlighted
        const hoverSelectedColor = "rgba(128, 0, 128, 0.9)"; // Purple - Hovered & Highlighted

        // Draw the states with the base color
        svg
          .selectAll(".state-tile")
          .data(states)
          .join("path")
          .attr("class", "state-tile")
          .attr("d", path)
          .attr("fill", baseColor)
          .attr("stroke", "#222")
          .attr("stroke-width", 1)
          .on("mouseover", function (event, d) {
            const tile = d3.select(this);
            const isSelected = tile.classed("selected");

            tile.transition()
              .duration(100)
              .attr("fill", isSelected ? hoverSelectedColor : hoverColor);
          })
          .on("mouseout", function (event, d) {
            const tile = d3.select(this);
            const isSelected = tile.classed("selected");

            tile.transition()
              .duration(100)
              .attr("fill", isSelected ? selectedColor : baseColor);
          })
          .on("click", function (event, d) {
            const tile = d3.select(this);
            const isSelected = tile.classed("selected");

            // Toggle the "selected" state
            tile.classed("selected", !isSelected);

            // Update the fill color based on selection state
            tile.attr("fill", isSelected ? baseColor : selectedColor);
          });

        // Add labels to each state
        svg
          .selectAll(".state-label")
          .data(states)
          .join("text")
          .attr("class", "state-label")
          .attr("x", (d) => path.centroid(d)[0]) // Label position: x-coordinate
          .attr("y", (d) => path.centroid(d)[1]) // Label position: y-coordinate
          .attr("text-anchor", "middle") // Center the text
          .attr("alignment-baseline", "middle")
          .attr("font-size", "12px") // Larger font size
          .attr("font-weight", "bold")
          .attr("fill", "#FFFFFF") // White text for better visibility
          .text((d) => stateIdToAbbreviation[d.id] || ""); // Use state abbreviation or empty string
      })
      .catch((err) => console.error("Error loading topo.json:", err));
  }, []);

  return <svg ref={svgRef} />;
};

export default Tilemap;