import React, { useState, useEffect } from "react";
import GestureDetector from "./components/GestureDetector";
import MediaControls from "./components/MediaControls";

const App = () => {
  const [gesture, setGesture] = useState("None");
  const [currentSong, setCurrentSong] = useState({
    name: "No song playing",
    artists: "Unknown",
    album: "Unknown",
  });
  const [shuffleState, setShuffleState] = useState(false); // Track shuffle state
  const [loopState, setLoopState] = useState("off");

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

      // Fetch initial playback state including loop and shuffle state
      fetchPlaybackState(accessToken);
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

  // Fetch the playback state (loop and shuffle state)
  const fetchPlaybackState = (accessToken) => {
    fetch("https://api.spotify.com/v1/me/player", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setShuffleState(data.shuffle_state);
          setLoopState(data.repeat_state);
        }
      })
      .catch((error) => console.error("Error fetching playback state:", error));
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

  // Toggle shuffle state and notify about it
  const toggleShuffle = () => {
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      console.error("No access token found");
      return;
    }

    fetch("http://localhost:5001/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "Shuffle" }),
    })
      .then((response) => response.json())
      .then(() => {
        // Toggle shuffle state in the UI and display the appropriate message
        const newShuffleState = !shuffleState;
        setShuffleState(newShuffleState);
        showNotification(`Shuffle is now ${newShuffleState ? "enabled" : "disabled"}`);
      })
      .catch((error) => console.error("Error toggling shuffle:", error));
  };

  // Toggle loop state and notify about it
  const toggleLoop = () => {
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      console.error("No access token found");
      return;
    }

    fetch("http://localhost:5001/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action: "Loop" }),
    })
      .then((response) => response.json())
      .then(() => {
        // Toggle loop state and display the appropriate message
        if (loopState === "off") {
          setLoopState("context");
          showNotification("Loop is now set to context.");
        } else if (loopState === "context") {
          setLoopState("track");
          showNotification("Loop is now set to track.");
        } else if (loopState === "track") {
          setLoopState("off");
          showNotification("Loop is now turned off.");
        }
      })
      .catch((error) => console.error("Error toggling loop:", error));
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
      <button onClick={toggleShuffle}>
        {shuffleState ? "Disable Shuffle" : "Enable Shuffle"}
      </button>
      <button onClick={toggleLoop}>
        {loopState === "off"
          ? "Enable Loop"
          : loopState === "track"
          ? "Loop Track"
          : "Loop Context"}
      </button>

      <div style={{ marginTop: "20px" }}>
        <button onClick={handleSpotifyLogin}>Login to Spotify</button>
      </div>
    </div>
  );
};

export default App;
