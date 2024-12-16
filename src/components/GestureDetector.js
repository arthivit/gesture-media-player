import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";

const GestureDetector = ({ onGestureDetected }) => {
  const [model, setModel] = useState(null);
  const [metadata, setMetadata] = useState(null); // Store metadata
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null); // Track errors
  const videoRef = useRef(null);
  
  const lastDetectionTime = useRef(0); // Keep track of the last detection time
  const detectionInProgress = useRef(false); // Avoid concurrent detections
  const animationFrameId = useRef(null); // Store the requestAnimationFrame ID

  const MIN_DETECTION_INTERVAL = 5000; // Minimum time between detections in milliseconds (e.g., 100ms)

  // Load the model and metadata when the component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log("Loading model...");
        const loadedModel = await tf.loadLayersModel("http://localhost:5001/model/model.json");
        setModel(loadedModel);
        console.log("Model loaded successfully");

        const metadataResponse = await fetch("http://localhost:5001/model/metadata.json");
        if (!metadataResponse.ok) {
          throw new Error("Failed to load metadata");
        }
        const metadataJson = await metadataResponse.json();
        setMetadata(metadataJson);
        console.log("Metadata loaded successfully");

      } catch (error) {
        console.error("Error loading model or metadata:", error);
        setError(error.message); // Set error message in state for display
      }
    };

    loadModel();
  }, []);

  // Start webcam feed
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        console.log("Webcam stream initialized.");
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setError("Error accessing webcam: " + error.message); // Display webcam error
      }
    };
    startWebcam();
  }, []);

  // Gesture detection function with throttling
  const detectGesture = async () => {
    if (model && metadata && videoRef.current && !detectionInProgress.current) {
      detectionInProgress.current = true; // Lock detection until complete

      const currentTime = Date.now();
      const video = videoRef.current;

      // Skip this detection if we haven't waited enough since the last one
      if (currentTime - lastDetectionTime.current < MIN_DETECTION_INTERVAL) {
        detectionInProgress.current = false;
        return; // Skip this frame to prevent too many requests
      }

      lastDetectionTime.current = currentTime; // Update last detection time

      try {
        // Preprocess video input
        const tensor = tf.browser
          .fromPixels(video)
          .resizeNearestNeighbor([224, 224]) // Match model's input size
          .expandDims()
          .toFloat()
          .div(tf.scalar(255));

        // Predict gesture
        const predictions = await model.predict(tensor).data();
        const gestureIndex = predictions.indexOf(Math.max(...predictions));

        // Use metadata to map the index to gesture label
        const gestureLabels = metadata.labels || []; // Assuming labels are in "labels" property
        const detectedGesture = gestureLabels[gestureIndex] || "Unknown"; // Fallback to "Unknown"

        console.log(`Detected gesture: ${detectedGesture}`);

        // Only trigger gesture if it is a valid gesture
        if (onGestureDetected) {
          onGestureDetected(detectedGesture);
        }
        
      } catch (error) {
        console.error("Error detecting gesture:", error);
        setError("Error detecting gesture: " + error.message); // Display gesture detection error
      } finally {
        detectionInProgress.current = false; // Unlock detection after completing
      }
    }
  };

  // Start or stop gesture detection
  useEffect(() => {
    const loop = () => {
      if (isDetecting) {
        detectGesture();
        animationFrameId.current = requestAnimationFrame(loop); // Recurse with the next frame
      }
    };

    if (isDetecting) {
      loop(); // Start the detection loop
    }

    // Cleanup on component unmount or when detection is stopped
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current); // Stop the loop
        animationFrameId.current = null;
      }
    };
  }, [isDetecting, model, metadata]);

  const toggleDetection = () => setIsDetecting((prev) => !prev);

  return (
    <div>
      <h2>Gesture Detection</h2>
      <button onClick={toggleDetection}>
        {isDetecting ? "Stop Detecting" : "Start Detecting"}
      </button>
      
      {/* Error handling display */}
      {error && <div style={{ color: "red", fontWeight: "bold" }}>{error}</div>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ display: "none" }} // Hide the video feed for gesture detection
        onLoadedData={() => console.log("Video feed ready")}
      />
    </div>
  );
};

export default GestureDetector;
