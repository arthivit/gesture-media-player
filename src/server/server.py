import os
import requests
from flask import Flask, request, redirect, jsonify, session
from urllib.parse import urlencode
from dotenv import load_dotenv
from flask_cors import CORS
import logging

load_dotenv()

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Set up your credentials from Spotify Developer Dashboard
CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
REDIRECT_URI = 'http://localhost:3000/callback'  # This should match your Spotify app's redirect URI
SPOTIFY_API_URL = 'https://api.spotify.com/v1/me/player'

# Session secret key
app.secret_key = os.getenv('SESSION_SECRET_KEY')

# Step 1: Redirect user to Spotify for authentication
@app.route('/login')
def login():
    # Log the attempt to log in
    logging.debug("Login route hit. Clearing session.")
    
    session.clear()  # Forces a fresh login

    # Check if session already contains access_token to prevent login
    if session.get('access_token'):
        logging.debug("User already authenticated, skipping login.")
        return redirect('/control')  # or redirect to your main app page
    
    # Prepare the authorization URL
    auth_url = 'https://accounts.spotify.com/authorize?' + urlencode({
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': 'user-library-read user-read-playback-state user-modify-playback-state',
    })
    
    # Log the generated auth URL for debugging
    logging.debug(f"Redirecting to: {auth_url}")
    
    # Redirect user to the Spotify authorization page
    return redirect(auth_url)

# Step 2: Handle Spotify redirect and exchange authorization code for access token
@app.route('/callback')
def callback():
    # Extract authorization code from the URL
    code = request.args.get('code')
    
    # Log the callback code
    logging.debug(f"Callback received with code: {code}")

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
        
        # Log the successful token retrieval
        logging.debug(f"Tokens retrieved: {access_token} and {refresh_token}")
        
        # Store the access token in the session for further API calls
        session['access_token'] = access_token
        session['refresh_token'] = refresh_token
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token
        })
    else:
        logging.error("Error retrieving tokens from Spotify")
        return jsonify({'error': 'Unable to get token'}), 400

# Endpoint to handle playback control actions like Play, Pause, Next, Previous
@app.route('/control', methods=['POST'])
def control():
    # Log the control attempt
    logging.debug("Control route hit")
    
    # Extract action from the request
    action = request.json.get('action')
    access_token = session.get('access_token')

    if not access_token:
        logging.error("Unauthorized: No access token found in session.")
        return jsonify({'error': 'Unauthorized, please log in to Spotify'}), 401

    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    if action == "Play":
        logging.debug("Playing media")
        response = requests.put(f"{SPOTIFY_API_URL}/play", headers=headers)
    elif action == "Pause":
        logging.debug("Pausing media")
        response = requests.put(f"{SPOTIFY_API_URL}/pause", headers=headers)
    elif action == "Next":
        logging.debug("Skipping to next track")
        response = requests.post(f"{SPOTIFY_API_URL}/next", headers=headers)
    elif action == "Previous":
        logging.debug("Going to previous track")
        response = requests.post(f"{SPOTIFY_API_URL}/previous", headers=headers)
    else:
        logging.error("Unknown action")
        return jsonify({'error': 'Unknown action'}), 400
    
    if response.status_code == 200:
        return jsonify({'status': 'success'})
    else:
        logging.error(f"Failed to execute action on Spotify: {response.status_code}")
        return jsonify({'error': 'Failed to execute action on Spotify'}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
