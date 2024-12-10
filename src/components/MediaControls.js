import React, { useState, useEffect } from "react";
import "./MediaControls.css"; // Include CSS file

const MediaControls = ({ onGestureDetected }) => {
  const [action, setAction] = useState(null);

  // Function to handle gestures (pass the detected gesture from GestureDetector or button press)
  const handleGesture = (action) => {
    console.log(`Action: ${action}`);
    setAction(action); // Set action from detected gesture or button press

    // If onGestureDetected function is passed, call it
    if (onGestureDetected) {
      onGestureDetected(action); // Send the action to App.js to process
    } else {
      console.error("onGestureDetected is not a function");
    }
  };

  return (
    <div className="media-controls">
      <button onClick={() => handleGesture("Play")}>Play</button>
      <button onClick={() => handleGesture("Pause")}>Pause</button>
      <button onClick={() => handleGesture("Next")}>Next</button>
      <button onClick={() => handleGesture("Previous")}>Previous</button>
      <button onClick={() => handleGesture("Volume Up")}>Volume Up</button>
      <button onClick={() => handleGesture("Volume Down")}>Volume Down</button>
      <button onClick={() => handleGesture("Shuffle")}>Shuffle</button>
      <button onClick={() => handleGesture("Loop")}>Loop</button>
    </div>
  );
};

export default MediaControls;
