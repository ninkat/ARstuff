import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = ({ OverlayComponent }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gestures, setGestures] = useState({ left: "None", right: "None" });

  const gestureState = useRef({
    left: { start: null, clicked: false },
    right: { start: null, clicked: false },
  }); // Track gesture timing and click state
  const landmarkSmoothing = useRef({}); // For smoothing
  const clickPosition = useRef(null); // Track the position of the click for the blue circle

  const simulateClick = (x, y) => {
    const element = document.elementFromPoint(x, y); // Get the element under the given coordinates
    if (element) {
      // Log details about the element
      console.log("Element details:", {
        tagName: element.tagName, // HTML tag of the element
        id: element.id, // ID attribute
        classList: Array.from(element.classList), // List of classes
        attributes: Array.from(element.attributes).map((attr) => ({
          name: attr.name,
          value: attr.value,
        })), // All attributes
        textContent: element.textContent.trim(), // Text content
      });
  
      // Create and dispatch the click event
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      });
      element.dispatchEvent(event); // Dispatch the click event to the element
    }
    clickPosition.current = { x, y }; // Save the position of the click
  };

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const smoothLandmarks = (landmarks, hand) => {
      if (!landmarkSmoothing.current[hand]) {
        landmarkSmoothing.current[hand] = landmarks.map((landmark) => ({ ...landmark }));
      }

      return landmarks.map((landmark, index) => {
        const smoothed = {
          x: 0.7 * landmarkSmoothing.current[hand][index].x + 0.3 * landmark.x,
          y: 0.7 * landmarkSmoothing.current[hand][index].y + 0.3 * landmark.y,
        };
        landmarkSmoothing.current[hand][index] = smoothed;
        return smoothed;
      });
    };

    const handsOnResults = (results) => {
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.filter = "grayscale(100%)";
      canvasCtx.setTransform(-1, 0, 0, 1, canvasRef.current.width, 0);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.filter = "none";

      const newGestures = { left: "None", right: "None" };

      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const hand = results.multiHandedness[index].label.toLowerCase(); // "left" or "right"
          const smoothedLandmarks = smoothLandmarks(landmarks, hand);

          const thumbTip = smoothedLandmarks[4];
          const indexTip = smoothedLandmarks[8];

          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
              Math.pow(thumbTip.y - indexTip.y, 2)
          );

          if (distance < 0.05) {
            newGestures[hand] = "Pinch";

            if (!gestureState.current[hand].clicked) {
              if (!gestureState.current[hand].start) {
                gestureState.current[hand].start = Date.now();
              }

              const duration = Date.now() - gestureState.current[hand].start;
              if (duration >= 500) {
                // Map normalized coordinates to screen coordinates
                const x = thumbTip.x * canvasRef.current.width;
                const y = thumbTip.y * canvasRef.current.height;

                simulateClick(x, y); // Simulate a click at the location
                gestureState.current[hand].clicked = true; // Mark click as registered
                gestureState.current[hand].start = null; // Reset start time
              }
            }
          } else {
            // Reset gesture state when the pinch is released
            gestureState.current[hand].start = null;
            gestureState.current[hand].clicked = false;
          }

          smoothedLandmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasRef.current.width,
              landmark.y * canvasRef.current.height,
              2,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
          });
        });
      }

      // Draw the blue circle at the last click position
      if (clickPosition.current) {
        canvasCtx.beginPath();
        canvasCtx.arc(
          clickPosition.current.x,
          clickPosition.current.y,
          10, // Radius of the circle
          0,
          2 * Math.PI
        );
        canvasCtx.fillStyle = "blue";
        canvasCtx.fill();
      }

      setGestures(newGestures);
      canvasCtx.restore();
    };

    hands.onResults(handsOnResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
    });

    camera.start();

    return () => {
      camera.stop();
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Gesture State */}
      <div
        style={{
          marginBottom: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "18px",
          textAlign: "center",
        }}
      >
        <p>Left: {gestures.left}</p>
        <p>Right: {gestures.right}</p>
      </div>

      {/* Webcam feed container */}
      <div style={{ position: "relative", width: "1280px", height: "720px" }}>
        <video ref={videoRef} style={{ display: "none" }} />
        <canvas
          ref={canvasRef}
          width="1280"
          height="720"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        />

        {/* Overlay Component */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            pointerEvents: "auto", // Allows interaction with the overlay component
          }}
        >
          {OverlayComponent}
        </div>
      </div>
    </div>
  );
};

export default HandTracking;