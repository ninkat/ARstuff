import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";

/**
 * SankeyDiagram Component
 * This component renders an interactive Sankey Diagram using D3.js and React.
 * It processes data from a CSV file, creates the Sankey layout, and handles interactivity.
 *
 * @param {Object} props - Component properties
 * @param {string} props.fileName - The filename of the CSV data
 * @param {number} props.width - The width of the SVG canvas
 * @param {number} props.height - The height of the SVG canvas
 */
const SankeyDiagram = ({ fileName, width, height }) => {
  const svgRef = useRef();
  const [sankeyData, setSankeyData] = useState(null);
  const [activeNodes, setActiveNodes] = useState({ source: null, target: null });

  // Effect to load and process data
  useEffect(() => {
    const loadData = async () => {
      const rawData = await d3.csv(fileName);
      const nodesSet = new Set();

      const links = rawData.map((row) => {
        nodesSet.add(row.vote);
        nodesSet.add(row.group);
        return { source: row.vote, target: row.group, value: +row.value };
      });

      const nodes = Array.from(nodesSet).map((name) => ({ name }));
      const nodeIndex = new Map(nodes.map((node, i) => [node.name, i]));

      const formattedLinks = links.map((link) => ({
        source: nodeIndex.get(link.source),
        target: nodeIndex.get(link.target),
        value: link.value,
      }));

      setSankeyData({ nodes, links: formattedLinks });
    };

    loadData();
  }, [fileName]);

  // Effect to render the diagram when data or interactivity state changes
  useEffect(() => {
    if (!sankeyData) return;

    // Create Sankey layout
    const sankey = d3Sankey()
      .nodeWidth(80)
      .nodePadding(15)
      .extent([[1, 1], [width - 1, height - 1]]);

    const graph = sankey(sankeyData);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Render links
    const linkGroup = svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "rgba(170, 170, 170, 0.5)")
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.5);
      // If you want the links to be clickable, set pointer-events to all:
      // .attr("pointer-events", "all")

    // Render nodes
    const nodeGroup = svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", "rgba(70, 130, 180, 0.6)") // semi-transparent steel blue
      .attr("stroke", "rgba(0, 0, 0, 0.8)")    // semi-transparent black outline
      .attr("stroke-width", 1)
      .attr("pointer-events", "all") // Ensure the rects can receive pointer events
      .on("click", (event, d) => {
        // Example toggling between active source/target
        const isSource = d.depth === 0;
        const side = isSource ? "source" : "target";
        setActiveNodes((prev) => ({
          ...prev,
          [side]: prev[side]?.name === d.name ? null : d,
        }));
      });

    // Render labels
    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d) => (d.depth === 0 ? d.x1 + 6 : d.x0 - 6))
      .attr("text-anchor", (d) => (d.depth === 0 ? "start" : "end"))
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .text((d) => `${d.name} (${d.value})`)
      .attr("fill", "black")
      .style("font-size", "14px");

    // Highlight logic if source and target both selected
    if (activeNodes.source && activeNodes.target) {
      const { source, target } = activeNodes;
      linkGroup.attr("stroke", (d) =>
        (d.source.name === source.name && d.target.name === target.name) ||
        (d.source.name === target.name && d.target.name === source.name)
          ? "orange"
          : "rgba(170, 170, 170, 0.5)"
      );

      // Render link label (large number) in the middle if both source/target are active
      svg
        .append("g")
        .selectAll("text")
        .data(graph.links)
        .join("text")
        .attr("x", (d) => (d.source.x1 + d.target.x0) / 2)
        .attr("y", (d) => (d.source.y1 + d.source.y0) / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "36px")
        .attr("fill", (d) =>
          (d.source.name === source.name && d.target.name === target.name) ||
          (d.source.name === target.name && d.target.name === source.name)
            ? "orange"
            : "none"
        )
        .text((d) =>
          (d.source.name === source.name && d.target.name === target.name) ||
          (d.source.name === target.name && d.target.name === source.name)
            ? d.value
            : ""
        );
    } else {
      linkGroup.attr("stroke", "rgba(170, 170, 170, 0.5)");
    }

    // Color the nodes if they match active source/target
    nodeGroup.attr("fill", (d) =>
      activeNodes.source?.name === d.name || activeNodes.target?.name === d.name
        ? "orange"
        : "rgba(70, 130, 180, 0.6)"
    );
  }, [sankeyData, width, height, activeNodes]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default SankeyDiagram;