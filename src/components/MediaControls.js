import React, { useState } from "react";
import "./MediaControls.css"; // Include CSS file

const MediaControls = ({ onGestureDetected }) => {
  const [action, setAction] = useState(null);

  // Function to handle gestures (pass the detected gesture from GestureDetector)
  const handleGesture = (action) => {
    console.log(`Action: ${action}`);
    setAction(action); // Set action from detected gesture

    // Send the action to the backend to control Spotify
    fetch("http://localhost:5001/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Server response:", data);
      })
      .catch((error) => {
        console.error("Error sending gesture to server:", error);
      });
  };

  // Trigger action whenever gesture is detected
  React.useEffect(() => {
    if (action) {
      handleGesture(action); // Send detected action to backend
    }
  }, [action]); // Only trigger when `action` state changes

  return (
    <div className="media-controls">
      <button onClick={() => handleGesture("Play")}>Play</button>
      <button onClick={() => handleGesture("Pause")}>Pause</button>
      <button onClick={() => handleGesture("Next")}>Next</button>
      <button onClick={() => handleGesture("Previous")}>Previous</button>
      <button onClick={() => handleGesture("Volume Up")}>Volume Up</button>
      <button onClick={() => handleGesture("Volume Down")}>Volume Down</button>
    </div>
  );
};

export default MediaControls;
