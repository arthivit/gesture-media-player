import React, { useState, useEffect } from "react";
import GestureDetector from "./components/GestureDetector";
import MediaControls from "./components/MediaControls";

const App = () => {
  const [gesture, setGesture] = useState("None");

  useEffect(() => {
    // Extract access token and refresh token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // Store tokens in localStorage
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      console.log("Tokens stored in localStorage");
    }
  }, []);

  const handleGestureDetected = (detectedGesture) => {
    setGesture(detectedGesture);
    console.log(`Detected Gesture: ${detectedGesture}`);

    const accessToken = localStorage.getItem("access_token");
    console.log(`Access Token: ${accessToken}`);

    if (!accessToken) {
      console.error("No access token found");
      return;
    }

    // Send the detected gesture to the backend
    fetch("http://localhost:5001/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: detectedGesture }),
      credentials: "include", // Ensure cookies are sent for session handling
    })
      .then((response) => response.json())
      .then((data) => console.log("Server response:", data))
      .catch((error) => console.error("Error sending gesture to server:", error));
  };

  const handleSpotifyLogin = () => {
    window.location.href = "http://localhost:5001/login";
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Gesture-Based Media Player</h1>
      <div>
        <h2>Detected Gesture: {gesture}</h2>
      </div>

      <GestureDetector onGestureDetected={handleGestureDetected} />
      <MediaControls onGestureDetected={handleGestureDetected} />

      <div style={{ marginTop: "20px" }}>
        <button onClick={handleSpotifyLogin}>Login to Spotify</button>
      </div>
    </div>
  );
};

export default App;