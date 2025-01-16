import React, { useRef, useEffect } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = ({ OverlayComponent }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]); // Use a ref to manage dots without triggering re-renders

  const gestureState = useRef({
    left: { start: null, clicked: false },
    right: { start: null, clicked: false },
  });

  const landmarkSmoothing = useRef({});

  // Add a new dot at the specified position
  const addDot = (x, y) => {
    dotsRef.current.push({ x, y, timestamp: Date.now(), opacity: 1 });
  };

  // Simulate a click and add a dot
  const simulateClick = (xCanvas, yCanvas) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const xCanvasFlipped = canvasRef.current.width - xCanvas;
    const xPage = rect.left + xCanvasFlipped;
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

    addDot(xCanvas, yCanvas); // Add a new dot for this click
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
          const hand = results.multiHandedness[index].label.toLowerCase();
          const smoothedLandmarks = smoothLandmarks(landmarks, hand);

          const thumbTip = smoothedLandmarks[4];
          const indexTip = smoothedLandmarks[8];

          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
          );

          if (distance < 0.05) {
            if (!gestureState.current[hand].clicked) {
              if (!gestureState.current[hand].start) {
                gestureState.current[hand].start = Date.now();
              }

              const duration = Date.now() - gestureState.current[hand].start;
              if (duration >= 500) {
                const xCanvas = thumbTip.x * width;
                const yCanvas = thumbTip.y * height;
                simulateClick(xCanvas, yCanvas);
                gestureState.current[hand].clicked = true;
                gestureState.current[hand].start = null;
              }
            }
          } else {
            gestureState.current[hand].start = null;
            gestureState.current[hand].clicked = false;
          }

          smoothedLandmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(landmark.x * width, landmark.y * height, 2, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
          });
        });
      }

      // Update dots with fading opacity and remove expired dots
      const now = Date.now();
      dotsRef.current = dotsRef.current
        .map((dot) => ({
          ...dot,
          opacity: Math.max(0, 1 - (now - dot.timestamp) / 2000),
        }))
        .filter((dot) => now - dot.timestamp < 2000);

      // Draw dots with fading opacity
      dotsRef.current.forEach((dot) => {
        canvasCtx.beginPath();
        canvasCtx.arc(dot.x, dot.y, 10, 0, 2 * Math.PI);
        canvasCtx.fillStyle = `rgba(0, 0, 255, ${dot.opacity})`;
        canvasCtx.fill();
      });

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
            transform: "translate(-50%, -50%)", // Center the overlay both vertically and horizontally
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