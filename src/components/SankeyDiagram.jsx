import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";

/**
 * SankeyDiagram Component
 * This component renders an interactive Sankey Diagram using D3.js and React.
 * It allows users to interact with nodes such that:
 * - Only one node from each side (source or target) can be active at a time.
 * - When a node is clicked, the path between active source and target nodes is highlighted.
 * - Displays the value of the path on the highlighted path itself.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.data - The Sankey graph data containing nodes and links
 * @param {number} props.width - The width of the SVG canvas
 * @param {number} props.height - The height of the SVG canvas
 */
const SankeyDiagram = ({ data, width, height }) => {
  // Reference to the SVG element
  const svgRef = useRef();

  // State to track the currently active nodes (one per side: source and target)
  const [activeNodes, setActiveNodes] = useState({ source: null, target: null });

  // Effect to handle rendering and interactivity updates whenever data, dimensions, or activeNodes change
  useEffect(() => {
    // Early return if no data is provided
    if (!data) return;

    // Set up the Sankey layout
    const sankey = d3Sankey()
      .nodeWidth(80) // Width of the nodes
      .nodePadding(15) // Padding between nodes
      .extent([[1, 1], [width - 1, height - 1]]); // Diagram extent within the SVG

    // Generate the Sankey graph (nodes and links)
    const graph = sankey(data);

    // Select and clear the SVG element
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ======= Render Links =======
    const linkGroup = svg.append("g").selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal()) // Define link path
      .attr("fill", "none") // No fill for links
      .attr("stroke", "#aaa") // Default link color
      .attr("stroke-width", (d) => Math.max(1, d.width)) // Width based on flow value
      .attr("opacity", 0.7); // Slightly transparent links

    // ======= Render Nodes =======
    const nodeGroup = svg.append("g").selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (d) => d.x0) // Position based on Sankey layout
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0) // Width defined by layout
      .attr("height", (d) => d.y1 - d.y0) // Height defined by layout
      .attr("fill", "steelblue") // Default node color
      .attr("stroke", "#000") // Outline color
      .on("click", (event, d) => {
        // Determine if the clicked node is a source or target
        const isSource = d.depth === 0; // Nodes on the left side are sources
        const side = isSource ? "source" : "target";

        // Update state to set the active node for the corresponding side
        setActiveNodes((prev) => ({
          ...prev,
          [side]: prev[side]?.name === d.name ? null : d, // Toggle node activation
        }));
      });

    // ======= Render Node Labels =======
    svg.append("g").selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d) => (d.depth === 0 ? d.x1 + 6 : d.x0 - 6)) // Position based on depth
      .attr("text-anchor", (d) => (d.depth === 0 ? "start" : "end")) // Align text
      .attr("y", (d) => (d.y0 + d.y1) / 2) // Vertically center text
      .attr("dy", "0.35em") // Adjust vertical alignment
      .text((d) => `${d.name} (${d.value})`) // Display node name and value
      .attr("fill", "black") // Text color
      .style("font-size", "14px"); // Font size

    // ======= Highlight Active Paths and Render Path Labels =======
    if (activeNodes.source && activeNodes.target) {
      const { source, target } = activeNodes;

      linkGroup.attr("stroke", (d) => {
        // Highlight the link if it connects the active source and target nodes
        if (
          (d.source.name === source.name && d.target.name === target.name) ||
          (d.source.name === target.name && d.target.name === source.name)
        ) {
          return "orange"; // Highlight color
        }
        return "#aaa"; // Default color
      });

      // Add labels on highlighted paths
      svg.append("g")
        .selectAll("text")
        .data(graph.links)
        .join("text")
        .attr("x", (d) => (d.source.x1 + d.target.x0) / 2) // Position at the center of the link
        .attr("y", (d) => (d.source.y1 + d.source.y0) / 2) // Vertical alignment
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "36px")
        .attr("fill", (d) =>
          (d.source.name === source.name && d.target.name === target.name) ||
          (d.source.name === target.name && d.target.name === source.name)
            ? "orange" // Label color matches highlight
            : "none"
        )
        .text((d) =>
          (d.source.name === source.name && d.target.name === target.name) ||
          (d.source.name === target.name && d.target.name === source.name)
            ? d.value // Show value for highlighted links
            : ""
        );
    } else {
      // Reset link colors if no valid active path
      linkGroup.attr("stroke", "#aaa");
    }

    // ======= Highlight Active Nodes =======
    nodeGroup.attr("fill", (d) => {
      // Highlight nodes if they are active
      if (activeNodes.source?.name === d.name || activeNodes.target?.name === d.name) {
        return "orange";
      }
      return "steelblue"; // Default node color
    });
  }, [data, width, height, activeNodes]); // Dependencies for the effect

  // Render the SVG container
  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default SankeyDiagram;