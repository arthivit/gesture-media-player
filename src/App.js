import React, { useState } from "react";

const App = () => {
  const [gesture, setGesture] = useState("None");

  const handleGesture = async (detectedGesture) => {
    setGesture(detectedGesture);

    // Handle UI or local actions
    switch (detectedGesture) {
      case "Play":
        console.log("Playing media");
        break;
      case "Pause":
        console.log("Pausing media");
        break;
      case "Next":
        console.log("Skipping to next");
        break;
      case "Previous":
        console.log("Going to previous");
        break;
      default:
        console.log("Gesture not recognized");
    }

    // Send gesture to the backend
    try {
      const response = await fetch("http://localhost:5000/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: detectedGesture }),
      });

      const data = await response.json();
      console.log("Server response:", data);
    } catch (error) {
      console.error("Error sending gesture to server:", error);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Gesture-Based Media Player</h1>
      <div>
        <h2>Detected Gesture: {gesture}</h2>
      </div>
      <button onClick={() => handleGesture("Play")}>Simulate Play Gesture</button>
      <button onClick={() => handleGesture("Pause")}>Simulate Pause Gesture</button>
      <button onClick={() => handleGesture("Next")}>Simulate Next Gesture</button>
      <button onClick={() => handleGesture("Previous")}>Simulate Previous Gesture</button>
    </div>
  );
};

export default App;
