import React, { useState, useEffect } from "react";
import GestureDetector from "./components/GestureDetector";
import MediaControls from "./components/MediaControls";
//import TrackInfo from './TrackInfo';

const App = () => {
  const [gesture, setGesture] = useState("None");
  const [currentSong, setCurrentSong] = useState({
    name: "No song playing",
    artists: "Unknown",
    album: "Unknown",
  });

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
    })
      .then((response) => response.json())
      .then(() => {
        // Fetch song info after the action is processed
        fetchSongInfo(accessToken);
      })
      .catch((error) => console.error("Error sending gesture:", error));

    // Show notification for the detected gesture
    showNotification(`Gesture Recognized: ${detectedGesture}`);
  };

  // Function to fetch current song info
  const fetchSongInfo = (accessToken) => {
    fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data && data.item) {
          const { name, artists, album } = data.item;
          setCurrentSong({
            name,
            artists: artists.map((artist) => artist.name).join(", "),
            album: album.name,
          });
        } else {
          console.log("No song is currently playing.");
        }
      })
      .catch((error) => console.error("Error fetching song info:", error));
  };

  // Notification handler
  const showNotification = (message) => {
    const notification = document.createElement("div");
    notification.className = "gesture-notification";
    notification.innerText = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000); // Remove notification after 3 seconds
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

      <div className="song-info">
        <h3>Now Playing</h3>
        <p><strong>Song:</strong> {currentSong.name}</p>
        <p><strong>Artists:</strong> {currentSong.artists}</p>
        <p><strong>Album:</strong> {currentSong.album}</p>
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
