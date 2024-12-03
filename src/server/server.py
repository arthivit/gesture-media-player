import os
import requests
from flask import Flask, request, redirect, jsonify
from urllib.parse import urlencode
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Set up your credentials from Spotify Developer Dashboard
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
REDIRECT_URI = 'http://localhost:3000/callback'  # This should match your Spotify app's redirect URI


# Step 1: Redirect user to Spotify for authentication
@app.route('/login')
def login():
    # Prepare the authorization URL
    auth_url = 'https://accounts.spotify.com/authorize?' + urlencode({
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': 'user-library-read user-read-playback-state user-modify-playback-state',
    })
    
    # Redirect user to the Spotify authorization page
    return redirect(auth_url)

# Step 2: Handle Spotify redirect and exchange authorization code for access token
@app.route('/callback')
def callback():
    # Extract authorization code from the URL
    code = request.args.get('code')
    
    # Prepare token exchange request data
    token_url = 'https://accounts.spotify.com/api/token'
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }

    # Request an access token from Spotify
    response = requests.post(token_url, data=data)

    # If the request is successful, return the access token and refresh token
    if response.status_code == 200:
        token_info = response.json()
        access_token = token_info['access_token']
        refresh_token = token_info['refresh_token']
        
        # Optionally store the tokens or use them in your application
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token
        })
    else:
        return jsonify({'error': 'Unable to get token'}), 400

# Endpoint to handle playback control actions like Play, Pause, Next, Previous
@app.route('/control', methods=['POST'])
def control():
    # Extract action from the request
    action = request.json.get('action')
    
    # Handle each action here (this example just prints to the console for now)
    if action == "Play":
        print("Playing media")
        # Add code to interact with Spotify API for Play functionality
    elif action == "Pause":
        print("Pausing media")
        # Add code to interact with Spotify API for Pause functionality
    elif action == "Next":
        print("Skipping to next track")
        # Add code to interact with Spotify API for Next functionality
    elif action == "Previous":
        print("Going to previous track")
        # Add code to interact with Spotify API for Previous functionality
    else:
        return jsonify({'error': 'Unknown action'}), 400
    
    return jsonify({'status': 'success'})


if __name__ == '__main__':
    app.run(port=5001)
