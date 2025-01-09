import React, { useRef, useEffect } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const HandTracking = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      
      // Clear previous frames
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Flip video horizontally (mirroring effect)
      canvasCtx.setTransform(-1, 0, 0, 1, canvasRef.current.width, 0); // Flip horizontally
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw landmarks if any hands are detected
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          landmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
              landmark.x * canvasRef.current.width,
              landmark.y * canvasRef.current.height,
              5, // Radius of circle
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "red"; // Landmark color
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
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
      />
    </div>
  );
};

export default HandTracking;
