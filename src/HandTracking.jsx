import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as Fingerpose from "fingerpose";

const HandTracking = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [gesture, setGesture] = useState(null); // State to track recognized gesture

  useEffect(() => {
    // Initialize MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Define the results callback to process the hands
    hands.onResults((results) => {
      // Get the canvas context for drawing
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.setTransform(-1, 0, 0, 1, canvasRef.current.width, 0); // Flip horizontally
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw landmarks if hands are detected
      if (results.multiHandLandmarks) {
        const GE = new Fingerpose.GestureEstimator([
          Fingerpose.Gestures.ThumbsUpGesture,
          Fingerpose.Gestures.VictoryGesture,
        ]);

        results.multiHandLandmarks.forEach((landmarks) => {
          // Recognize gesture using Fingerpose
          const gestureEstimation = GE.estimate(landmarks, 7.5); // Higher score threshold for accuracy
          if (gestureEstimation.gestures.length > 0) {
            const bestGesture = gestureEstimation.gestures.reduce((a, b) => (a.score > b.score ? a : b));
            setGesture(bestGesture.name); // Set the recognized gesture
          }

          // Draw landmarks
          landmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasRef.current.width,
              landmark.y * canvasRef.current.height,
              5,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
          });
        });
      }
      canvasCtx.restore();
    });

    // Set up the camera
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    // Start the camera
    camera.start();

    return () => {
      camera.stop();
    };
  }, []);

  return (
    <div>
      {/* Hidden video element */}
      <video ref={videoRef} style={{ display: "none" }} />
      {/* Canvas element displaying both video feed and landmarks */}
      <canvas ref={canvasRef} width="640" height="480" />
      {/* Display the recognized gesture */}
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
        Gesture: {gesture || "None"}
      </div>
    </div>
  );
};

export default HandTracking;