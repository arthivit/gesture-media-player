export const detectGesture = (videoElement, onGestureDetected) => {
    console.log("Starting gesture detection...");
  
    // Placeholder for teachable machine
    setInterval(() => {
      const gestures = ["Play", "Pause", "Next", "Previous", "None"];
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
      onGestureDetected(randomGesture);
    }, 3000);
  };
  