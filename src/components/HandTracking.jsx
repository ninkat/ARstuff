import React, { useRef, useEffect } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = ({ OverlayComponent }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gestureState = useRef({
    left: { start: null, clicked: false },
    right: { start: null, clicked: false },
  });
  const landmarkSmoothing = useRef({});
  const hoverState = useRef({
    left: { element: null },
    right: { element: null },
  });

  // Simulate a click for a specific hand
  const simulateClick = (xCanvas, yCanvas, hand) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const xPage = rect.left + (canvasRef.current.width - xCanvas);
    const yPage = rect.top + yCanvas;

    const element = document.elementFromPoint(xPage, yPage);
    if (element) {
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: xPage,
        clientY: yPage,
      });
      element.dispatchEvent(event);
    }

    gestureState.current[hand].clicked = true;
  };

  // Simulate hover effect for a specific hand
  const simulateHover = (xCanvas, yCanvas, hand) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const xPage = rect.left + (canvasRef.current.width - xCanvas);
    const yPage = rect.top + yCanvas;

    const hoveredElement = document.elementFromPoint(xPage, yPage);

    if (hoverState.current[hand].element !== hoveredElement) {
      if (hoverState.current[hand].element) {
        hoverState.current[hand].element.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, cancelable: true })
        );
      }
      if (hoveredElement) {
        hoveredElement.dispatchEvent(
          new MouseEvent("mouseover", { bubbles: true, cancelable: true })
        );
      }
      hoverState.current[hand].element = hoveredElement;
    }
  };

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2, // Support both hands
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const smoothLandmarks = (landmarks, handLabel) => {
      if (!landmarkSmoothing.current[handLabel]) {
        landmarkSmoothing.current[handLabel] = landmarks.map((lm) => ({ ...lm }));
      }
      return landmarks.map((landmark, index) => {
        const prev = landmarkSmoothing.current[handLabel][index];
        const smoothed = {
          x: 0.7 * prev.x + 0.3 * landmark.x,
          y: 0.7 * prev.y + 0.3 * landmark.y,
        };
        landmarkSmoothing.current[handLabel][index] = smoothed;
        return smoothed;
      });
    };

    const handsOnResults = (results) => {
      const canvasCtx = canvasRef.current.getContext("2d");
      const { width, height } = canvasRef.current;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);

      canvasCtx.filter = "grayscale(100%)";
      canvasCtx.setTransform(-1, 0, 0, 1, width, 0);
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      canvasCtx.filter = "none";

      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const hand = results.multiHandedness[index].label.toLowerCase(); // "left" or "right"
          const smoothedLandmarks = smoothLandmarks(landmarks, hand);

          const thumbTip = smoothedLandmarks[4];
          const indexTip = smoothedLandmarks[8];

          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
          );

          // Convert normalized coordinates to canvas pixels
          const xCanvas = indexTip.x * width;
          const yCanvas = indexTip.y * height;

          // Simulate hover for this hand
          simulateHover(xCanvas, yCanvas, hand);

          // Pinch detection and click simulation for this hand
          if (distance < 0.05) {
            if (!gestureState.current[hand].clicked) {
              if (!gestureState.current[hand].start) {
                gestureState.current[hand].start = Date.now();
              }

              const duration = Date.now() - gestureState.current[hand].start;
              if (duration >= 500) {
                simulateClick(xCanvas, yCanvas, hand);
                gestureState.current[hand].clicked = true;
                gestureState.current[hand].start = null;
              }
            }
          } else {
            gestureState.current[hand].start = null;
            gestureState.current[hand].clicked = false;
          }

          // Draw an indicator at indexTip (each hand gets its own color)
          canvasCtx.beginPath();
          canvasCtx.arc(xCanvas, yCanvas, 6, 0, 2 * Math.PI);
          canvasCtx.fillStyle = hand === "left" ? "red" : "blue"; // Left hand is red, right is blue
          canvasCtx.fill();
        });
      }

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
      <div style={{ position: "relative", width: "1280px", height: "720px" }}>
        <video ref={videoRef} style={{ display: "none" }} />
        <canvas
          ref={canvasRef}
          width="1280"
          height="720"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            pointerEvents: "auto",
          }}
        >
          {OverlayComponent}
        </div>
      </div>
    </div>
  );
};

export default HandTracking;