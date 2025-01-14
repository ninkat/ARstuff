import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gestures, setGestures] = useState({ left: "None", right: "None" });

  // A smoothing buffer to stabilize landmark positions
  const landmarkSmoothing = useRef({});

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
        // Initialize smoothing buffer if not present
        landmarkSmoothing.current[hand] = landmarks.map((landmark) => ({ ...landmark }));
      }

      // Apply smoothing: Weighted average with previous positions
      return landmarks.map((landmark, index) => {
        const smoothed = {
          x: 0.7 * landmarkSmoothing.current[hand][index].x + 0.3 * landmark.x,
          y: 0.7 * landmarkSmoothing.current[hand][index].y + 0.3 * landmark.y,
        };
        landmarkSmoothing.current[hand][index] = smoothed; // Update buffer
        return smoothed;
      });
    };

    const handsOnResults = (results) => {
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.setTransform(-1, 0, 0, 1, canvasRef.current.width, 0); // Flip horizontally
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      const newGestures = { left: "None", right: "None" };

      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const hand = results.multiHandedness[index].label; // "Left" or "Right"

          // Smooth landmarks for the hand
          const smoothedLandmarks = smoothLandmarks(landmarks, hand);

          const thumbTip = smoothedLandmarks[4]; // Tip of the thumb
          const indexTip = smoothedLandmarks[8]; // Tip of the index finger

          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
          );

          if (distance < 0.1) {
            newGestures[hand.toLowerCase()] = "Pinch";
          }

          // Draw smaller, consistent circles for landmarks
          smoothedLandmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasRef.current.width,
              landmark.y * canvasRef.current.height,
              2, // Fixed radius for consistent size
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
          });
        });
      }

      setGestures(newGestures);
      canvasCtx.restore();
    };

    hands.onResults(handsOnResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width="640" height="480" />
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "18px",
        }}
      >
        {/* DON'T CHANGE THIS! It's inverted because the canvas is! */}
        <p>Left: {gestures.right}</p>
        <p>Right: {gestures.left}</p>
      </div>
    </div>
  );
};

export default HandTracking;