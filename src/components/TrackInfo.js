import React, { useState, useEffect } from 'react';
import "./TrackInfo.css"; // Include CSS file

const TrackInfo = ({ accessToken }) => {
  const [trackInfo, setTrackInfo] = useState(null);

  const fetchTrackInfo = async () => {
    try {
      const response = await fetch('http://localhost:5001/current-track', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTrackInfo(data);
      } else {
        console.error('Failed to fetch track info');
      }
    } catch (error) {
      console.error('Error fetching track info:', error);
    }
  };

  // Poll for current track info every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(fetchTrackInfo, 10000); // 10 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Handle gesture detection (e.g., button click or swipe)
  const handleGesture = () => {
    // Immediately fetch the current track when a gesture is detected
    fetchTrackInfo();
  };

  return (
    <div>
      <button onClick={handleGesture}>Fetch Track Info</button>
      <div>
        <h3>Currently Playing</h3>
        {trackInfo ? (
          <>
            <img src={trackInfo.albumCover} alt="Album Cover" />
            <p>Track: {trackInfo.name}</p>
            <p>Artist: {trackInfo.artist}</p>
          </>
        ) : (
          <p>Loading track information...</p>
        )}
      </div>
    </div>
  );
};

export default TrackInfo;
