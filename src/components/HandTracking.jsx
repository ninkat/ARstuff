import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = ({ OverlayComponent }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gestures, setGestures] = useState({ left: "None", right: "None" });

  // Tracks the pinch gesture timing to simulate clicks
  const gestureState = useRef({
    left: { start: null, clicked: false },
    right: { start: null, clicked: false },
  });

  // For smoothing the landmark positions
  const landmarkSmoothing = useRef({});
  // Position where we draw the 'click' circle
  const clickPosition = useRef(null);

  // ---------------------------------------------------------
  // Simulate a click by translating canvas coords to DOM coords
  // ---------------------------------------------------------
  const simulateClick = (xCanvas, yCanvas) => {
    // 1) Get bounding rect of the canvas
    const rect = canvasRef.current.getBoundingClientRect();
  
    // 2) Flip the X coordinate to account for the mirrored canvas
    const xCanvasFlipped = canvasRef.current.width - xCanvas;
  
    // 3) Translate from canvas coords to DOM/page coords
    const xPage = rect.left + xCanvasFlipped;
    const yPage = rect.top + yCanvas;
  
    // See which element is at that position in the DOM
    const element = document.elementFromPoint(xPage, yPage);
    if (element) {
      console.log("Element details:", {
        tagName: element.tagName,
        id: element.id,
        classList: Array.from(element.classList),
        attributes: Array.from(element.attributes).map((attr) => ({
          name: attr.name,
          value: attr.value,
        })),
        textContent: element.textContent.trim(),
      });
  
      // Create and dispatch the click event at DOM coordinates
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: xPage,
        clientY: yPage,
      });
      element.dispatchEvent(event);
    }
  
    // Draw the blue circle in the canvas at the pinch location
    clickPosition.current = { x: xCanvas, y: yCanvas };
  };

  // ---------------------------------------------------------
  // Setup the MediaPipe Hands
  // ---------------------------------------------------------
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

    // Smoothing function
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

    // Draw the results on the canvas and trigger a simulated click on pinch
    const handsOnResults = (results) => {
      const canvasCtx = canvasRef.current.getContext("2d");
      const { width, height } = canvasRef.current;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);

      // Optional: grayscale, flip horizontally for "mirror" effect
      canvasCtx.filter = "grayscale(100%)";
      canvasCtx.setTransform(-1, 0, 0, 1, width, 0);
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      canvasCtx.filter = "none";
      // End flipping

      const newGestures = { left: "None", right: "None" };

      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const hand = results.multiHandedness[index].label.toLowerCase(); // "left" or "right"
          const smoothedLandmarks = smoothLandmarks(landmarks, hand);

          const thumbTip = smoothedLandmarks[4];
          const indexTip = smoothedLandmarks[8];

          // Basic pinch detection
          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
          );

          if (distance < 0.05) {
            newGestures[hand] = "Pinch";

            if (!gestureState.current[hand].clicked) {
              if (!gestureState.current[hand].start) {
                gestureState.current[hand].start = Date.now();
              }

              const duration = Date.now() - gestureState.current[hand].start;
              if (duration >= 500) {
                // Coordinates in the *canvas* space
                const xCanvas = thumbTip.x * width;
                const yCanvas = thumbTip.y * height;

                // Simulate a click at the location
                simulateClick(xCanvas, yCanvas);
                // Mark click as registered
                gestureState.current[hand].clicked = true; 
                // Reset start time
                gestureState.current[hand].start = null;
              }
            }
          } else {
            // Reset gesture state when the pinch is released
            gestureState.current[hand].start = null;
            gestureState.current[hand].clicked = false;
          }

          // Draw red circles for each landmark
          smoothedLandmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(landmark.x * width, landmark.y * height, 2, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
          });
        });
      }

      // Draw a blue circle at the last click position
      if (clickPosition.current) {
        canvasCtx.beginPath();
        canvasCtx.arc(clickPosition.current.x, clickPosition.current.y, 10, 0, 2 * Math.PI);
        canvasCtx.fillStyle = "blue";
        canvasCtx.fill();
      }

      setGestures(newGestures);
      canvasCtx.restore();
    };

    hands.onResults(handsOnResults);

    // Initialize camera
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

      {/* Webcam feed + Canvas container */}
      <div style={{ position: "relative", width: "1280px", height: "720px" }}>
        <video ref={videoRef} style={{ display: "none" }} />
        <canvas
          ref={canvasRef}
          width="1280"
          height="720"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        />

        {/* Overlay Component on top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            // If you want the actual user mouse to pass through the overlay, 
            // set pointerEvents: 'none'. For simulated clicks, this is not mandatory.
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