import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const OptimizedForceGraph = ({ fileName, width = 640, height = 400 }) => {
  const containerRef = useRef();
  const selectedNodes = useRef([]); // Use an array to track selected nodes

  useEffect(() => {
    let simulation; // to stop simulation on unmount
    d3.json(fileName).then((data) => {
      const nodes = data.nodes.map((d) => ({ ...d }));
      const links = data.links.map((d) => ({ ...d }));

      // Create adjacency list for pathfinding
      const adjacencyList = {};
      nodes.forEach((node) => (adjacencyList[node.id] = []));
      links.forEach((link) => {
        adjacencyList[link.source].push(link.target);
        adjacencyList[link.target].push(link.source); // For undirected graph
      });

      // Create SVG using d3.create
      const svg = d3
        .create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]) // ViewBox starts at (0, 0)
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Set up forces
      simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d) => d.id)
            .distance(150) // Increased distance to spread out nodes
        )
        .force("charge", d3.forceManyBody().strength(-300)) // Increased repulsion for more spacing
        .force("center", d3.forceCenter(width / 2, height / 2)); // Center within the SVG

      const link = svg
        .append("g")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 3) // Increased stroke width
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("class", "graph-link");

      const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 25) // Increased node size
        .attr("fill", "rgba(70, 130, 180, 0.6)")
        .attr("pointer-events", "all")
        .call(
          d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
        .on("click", (event, d) => {
          // Manage selection of nodes
          if (selectedNodes.current.includes(d.id)) {
            // Deselect if already selected
            selectedNodes.current = selectedNodes.current.filter(
              (id) => id !== d.id
            );
          } else {
            // Add to selection, replace earliest if at max capacity
            if (selectedNodes.current.length >= 2) {
              selectedNodes.current.shift(); // Remove the earliest selected node
            }
            selectedNodes.current.push(d.id);
          }

          // Update node colors directly
          node.attr("fill", (n) =>
            selectedNodes.current.includes(n.id)
              ? "orange"
              : "rgba(70, 130, 180, 0.6)"
          );

          // Highlight shortest path if two nodes are selected
          if (selectedNodes.current.length === 2) {
            const [source, target] = selectedNodes.current;
            const path = findShortestPath(source, target, adjacencyList);

            // Update link colors for shortest path
            link.attr("stroke", (l) =>
              path.includes(l.source.id) && path.includes(l.target.id)
                ? "orange"
                : "#aaa"
            );
          } else {
            // Reset link colors if fewer than two nodes are selected
            link.attr("stroke", "#aaa");
          }
        });

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        node
          .attr("cx", (d) => (d.x = Math.max(25, Math.min(width - 25, d.x)))) // Clamp x
          .attr("cy", (d) => (d.y = Math.max(25, Math.min(height - 25, d.y)))); // Clamp y
      });

      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      // Append the created SVG to the container
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(svg.node());

      // Optionally stop the simulation after a delay to stabilize performance
      setTimeout(() => simulation.stop(), 5000);
    });

    // Cleanup function to stop simulation on unmount
    return () => simulation && simulation.stop();
  }, [fileName, width, height]);

  // Breadth-First Search to find the shortest path
  const findShortestPath = (start, end, adjacencyList) => {
    const queue = [[start]];
    const visited = new Set();

    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];

      if (node === end) return path;

      if (!visited.has(node)) {
        visited.add(node);
        const neighbors = adjacencyList[node];
        for (const neighbor of neighbors) {
          const newPath = [...path, neighbor];
          queue.push(newPath);
        }
      }
    }

    return []; // No path found
  };

  return <div ref={containerRef}></div>;
};

export default OptimizedForceGraph;