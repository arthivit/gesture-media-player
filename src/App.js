import React, { useState } from "react";
import GestureDetector from "./components/GestureDetector";  // Assuming you have this file for gesture detection
import MediaControls from "./components/mediaControls";      // Assuming you have this file for media controls

const App = () => {
  const [gesture, setGesture] = useState("None");

  // Function to handle detected gestures and update the state
  const handleGestureDetected = (detectedGesture) => {
    setGesture(detectedGesture);
    console.log(`Detected Gesture: ${detectedGesture}`);

    // Get the access token from localStorage
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      console.log("No access token found");
      return;
    }

    // Send the gesture to the backend with access token in headers
    fetch("http://localhost:5001/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,  // Include the access token
      },
      body: JSON.stringify({ action: detectedGesture }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Server response:", data);
      })
      .catch((error) => {
        console.error("Error sending gesture to server:", error);
      });
  };

  // Function to redirect to Flask backend to start Spotify authentication
  const handleSpotifyLogin = () => {
    // Directly redirect the user to the Flask backend login route
    window.location.href = "http://localhost:5001/login";
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Gesture-Based Media Player</h1>
      <div>
        <h2>Detected Gesture: {gesture}</h2>
      </div>

      {/* Gesture Detection */}
      <GestureDetector onGestureDetected={handleGestureDetected} />

      {/* Media Controls (buttons for actions) */}
      <MediaControls onGesture={handleGestureDetected} />

      {/* Spotify Login button */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={handleSpotifyLogin}>Login to Spotify</button>
      </div>
    </div>
  );
};

export default App;
