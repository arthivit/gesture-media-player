import React from "react";

const MediaControls = ({ onGesture }) => {
  return (
    <div className="media-controls">
      <button onClick={() => onGesture("Play")}>Play</button>
      <button onClick={() => onGesture("Pause")}>Pause</button>
      <button onClick={() => onGesture("Next")}>Next</button>
      <button onClick={() => onGesture("Previous")}>Previous</button>
      <button onClick={() => onGesture("Volume Up")}>Volume Up</button>
      <button onClick={() => onGesture("Volume Down")}>Volume Down</button>
    </div>
  );
};

export default MediaControls;
