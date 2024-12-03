import React, { useState, useEffect } from "react";

// Gesture detection function (simulates detection for now, but should use actual input method later)
export const detectGesture = (videoElement, onGestureDetected) => {
  console.log("Starting gesture detection...");

  // Simulate gesture detection using real input (replace this with actual gesture recognition code)
  // For now, we simulate gestures when start detection is toggled
  const gestures = ["Play", "Pause", "Next", "Previous", "None"];
  const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];

  // Call the callback function to notify the parent component of detected gestures
  onGestureDetected(randomGesture);
};

// GestureDetector component
const GestureDetector = ({ onGestureDetected }) => {
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    let gestureDetectionInterval;

    if (isDetecting) {
      // Start detection
      const videoElement = document.createElement('video'); // Placeholder for real video element
      gestureDetectionInterval = setInterval(() => {
        detectGesture(videoElement, onGestureDetected);  // Start detecting gestures and notifying the parent
      }, 3000); // Trigger every 3 seconds
    }

    // Clean up when detection is stopped
    return () => {
      if (gestureDetectionInterval) {
        clearInterval(gestureDetectionInterval);
        console.log("Stopping gesture detection...");
      }
    };
  }, [isDetecting, onGestureDetected]);

  const toggleDetection = () => {
    setIsDetecting((prev) => !prev); // Toggle detection
  };

  return (
    <div>
      <h2>Gesture Detection</h2>
      <button onClick={toggleDetection}>
        {isDetecting ? "Stop Detecting" : "Start Detecting"}
      </button>
    </div>
  );
};

export default GestureDetector;
