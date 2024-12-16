import React, { useState, useEffect } from "react";
import GestureDetector from "./components/GestureDetector";
import MediaControls from "./components/MediaControls";
import './App.css';

const App = () => {
  const [webcamStream, setWebcamStream] = useState(null);
  const [gesture, setGesture] = useState("None");
  const [currentSong, setCurrentSong] = useState({
    name: "No song playing",
    artists: "Unknown",
    album: "Unknown",
    albumCover: "", // For storing album cover URL
  });
  const [shuffleState, setShuffleState] = useState(false); // Track shuffle state
  const [loopState, setLoopState] = useState("off");

  useEffect(() => {
    // Extract access token and refresh token from URL
    startWebcam();
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");
  
    if (accessToken && refreshToken) {
      // Store tokens in localStorage
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      console.log("Tokens stored in localStorage");
  
      // Fetch initial playback state and song info
      fetchPlaybackState(accessToken);
      fetchSongInfo(accessToken); // Add this to fetch song info immediately after login
    }
    return () => {
      // Cleanup webcam stream on component unmount
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startWebcam = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        setWebcamStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing webcam:", error);
      });
  };

  const handleGestureDetected = (detectedGesture) => {
    if (detectedGesture === "None") return; // Ignore "None" gestures
    console.log(`Gesture Detected: ${detectedGesture}`);
    setGesture(detectedGesture);

    const accessToken = localStorage.getItem("access_token");
  
    if (!accessToken) {
      console.error("No access token found");
      return;
    }
  
    // Map gestures to actions and send them to the backend
    const gestureActions = {
      "Skip Forward": "Next",      // Skip Forward
      "Skip Backward": "Previous", // Skip Backward
      "Pause/Play": "PlayPause",   // Toggle Play/Pause
      "Shuffle": "Shuffle",        // Toggle Shuffle
      "Loop": "Loop",              // Toggle Loop
      "Volume Up": "Volume Up",    // Increase volume
      "Volume Down": "Volume Down",// Decrease volume
      "Nothing": "Nothing",        // No action
    };
  
    const action = gestureActions[detectedGesture];
    if (action) {
      console.log(`Triggering action: ${action}`);
  
      fetch("http://localhost:5001/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action }),
      })
        .then((response) => response.json())
        .then(() => {
          // Update UI or playback state after the action is processed
          fetchSongInfo(accessToken);
        })
        .catch((error) => console.error("Error sending gesture action:", error));
  
      // Optionally, show a notification
      showNotification(`Gesture Triggered: ${detectedGesture}`);
    } else {
      console.log("No action mapped for this gesture.");
    }
  };

  const fetchAlbumCover = (albumId, accessToken) => {
    fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const albumCover = data.images && data.images.length > 0 ? data.images[0].url : "";
        setCurrentSong((prevState) => ({
          ...prevState,
          albumCover: albumCover,
        }));
      })
      .catch((error) => console.error("Error fetching album cover:", error));
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
          const { name, artists, album, images } = data.item;

          // Set the album cover from the images array in currently-playing data
          const albumCover = images && images.length > 0 ? images[0].url : "";

          setCurrentSong({
            name,
            artists: artists.map((artist) => artist.name).join(", "),
            album: album.name,
            albumCover: albumCover,
          });

          // If the album cover is missing, try to fetch it using the album ID
          if (!albumCover && album.id) {
            fetchAlbumCover(album.id, accessToken);
          }
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
      .then((response) => {
        if (!response.ok) {
          // Log the HTTP error status
          console.error(`HTTP error! Status: ${response.status} ${response.statusText}`);
          if (response.status === 204) {
            console.warn("No active playback (204 No Content).");
          }
          return null; // Prevent parsing non-JSON or empty responses
        }
        return response.json(); // Parse JSON for valid responses
      })
      .then((data) => {
        if (data) {
          // Ensure shuffle and loop states are available in the response
          if ("shuffle_state" in data && "repeat_state" in data) {
            setShuffleState(data.shuffle_state);
            setLoopState(data.repeat_state);
            console.log("Playback state updated:", data);
          } else {
            console.warn("Shuffle or loop state missing in playback state response.");
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching playback state:", error);
      });
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

  /* // Toggle shuffle state and notify about it
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
 */
  const handleSpotifyLogin = () => {
    window.location.href = "http://localhost:5001/login";
  };

  return (
    <div className="container">
      <h1>Gesture-Based Media Player</h1>
      <div style={{ marginTop: "20px" }}>
        <button onClick={handleSpotifyLogin}>Login to Spotify</button>
      </div>
      <div className="main-content">
      <div className="webcam-container">
        {/* Spotify-style box around Now Playing and Album Cover */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#000",
            borderRadius: "15px",
            padding: "20px",
            color: "#fff",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Album cover (or placeholder) */}
          {currentSong.albumCover ? (
            <img 
              src={currentSong.albumCover} 
              alt={`Album cover for ${currentSong.name}`} 
              style={{ width: "200px", height: "200px", borderRadius: "10px", marginRight: "20px" }} 
            />
          ) : (
            <div 
              style={{ 
                width: "200px", 
                height: "200px", 
                backgroundColor: "#e0e0e0", 
                borderRadius: "10px", 
                marginRight: "20px" 
              }}
            />
          )}
  
          {/* Song information */}
          <div>
            <h3 style={{ margin: "0 0 10px 0" }}>Now Playing</h3>
            <p style={{ margin: "5px 0" }}><strong>Song:</strong> {currentSong.name}</p>
            <p style={{ margin: "5px 0" }}><strong>Artists:</strong> {currentSong.artists}</p>
            <p style={{ margin: "5px 0" }}><strong>Album:</strong> {currentSong.album}</p>
          </div>
        </div>
      </div>
      <div className="webcam-container">
      <h3>Webcam Feed</h3>
        <video 
          autoPlay 
          playsInline 
          ref={(video) => {
            if (video && webcamStream) {
              video.srcObject = webcamStream;
            }
          }}
        />
      </div>
    </div>
      <GestureDetector onGestureDetected={handleGestureDetected} />
      <MediaControls onGestureDetected={handleGestureDetected} />
    </div>
  );  
};

export default App;
/**<button onClick={toggleShuffle}>
        {shuffleState ? "Disable Shuffle" : "Enable Shuffle"}
      </button>
      <button onClick={toggleLoop}>
        {loopState === "off"
          ? "Enable Loop"
          : loopState === "track"
          ? "Loop Track"
          : "Loop Context"}
      </button> */
