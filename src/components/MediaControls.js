import React from "react";
import "./MediaControls.css"; // Include CSS file

const MediaControls = ({ onGestureDetected, toggleShuffle, toggleLoop }) => {
  // Function to handle gestures (pass the detected gesture from GestureDetector or button press)
  const handleGesture = (action) => {
    console.log(`Action: ${action}`);

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
      
    </div>
  );
};

export default MediaControls;
