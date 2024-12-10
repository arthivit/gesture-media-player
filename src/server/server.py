import os
import requests
from flask import Flask, request, redirect, jsonify, session
from urllib.parse import urlencode
from dotenv import load_dotenv
from flask_cors import CORS
import logging

load_dotenv()

app = Flask(__name__)
# Allow credentials and configure allowed origins (frontend origin)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

logging.basicConfig(level=logging.DEBUG)

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:5001/callback"
SPOTIFY_API_URL = "https://api.spotify.com/v1/me/player"

logging.debug(f"Client ID: {CLIENT_ID}")
logging.debug(f"Client Secret: {CLIENT_SECRET}")

app.secret_key = os.getenv("SESSION_SECRET_KEY")

@app.route("/login")
def login():
    session.clear()

    auth_url = (
        "https://accounts.spotify.com/authorize?"
        + urlencode({
            "response_type": "code",
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "scope": "user-library-read user-read-playback-state user-modify-playback-state user-read-currently-playing",
        })
    )
    logging.debug(f"Redirecting to: {auth_url}")
    return redirect(auth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    logging.debug(f"Callback received with code: {code}")

    token_url = "https://accounts.spotify.com/api/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }

    response = requests.post(token_url, data=data)

    if response.status_code == 200:
        token_info = response.json()
        access_token = token_info["access_token"]
        refresh_token = token_info["refresh_token"]
        session["access_token"] = access_token
        session["refresh_token"] = refresh_token
        logging.debug("Access token retrieved successfully.")

        # Redirect back to the React app with the access_token as a query parameter
        redirect_url = f"http://localhost:3000?access_token={access_token}&refresh_token={refresh_token}"
        logging.debug(f"Redirecting to: {redirect_url}")
        return redirect(redirect_url)

    else:
        logging.error(f"Error retrieving tokens: {response.json()}")
        return jsonify({"error": "Unable to get token"}), 400


@app.route("/current-track", methods=["GET"])
def current_track():
    access_token = request.headers.get("Authorization").split(" ")[1]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Fetch current playback info from Spotify
    response = requests.get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)

    if response.status_code == 200:
        track_data = response.json()
        track_info = {
            "name": track_data['name'],
            "artist": track_data['artists'][0]['name'],
            "albumCover": track_data['album']['images'][0]['url']
        }
        return jsonify(track_info)
    else:
        return jsonify({"error": "Unable to fetch track info"}), 500

def get_current_shuffle_state(access_token):
    url = "https://api.spotify.com/v1/me/player"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        shuffle_state = data.get("shuffle_state", False)
        logging.debug(f"Current shuffle state: {shuffle_state}")
        return shuffle_state
    else:
        logging.error(f"Error fetching player state: {response.status_code}, {response.text}")
        return None


def toggle_shuffle(access_token):
    current_shuffle = get_current_shuffle_state(access_token)

    if current_shuffle is None:
        return "Error: Unable to fetch current shuffle state."

    new_state = not current_shuffle
    url = "https://api.spotify.com/v1/me/player/shuffle"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"state": new_state}

    response = requests.put(url, headers=headers, params=params)

    if response.status_code == 200:
        return f"Shuffle {'enabled' if new_state else 'disabled'} successfully."
    else:
        logging.error(f"Error updating shuffle state: {response.status_code}, {response.text}")
        return "Error: Unable to update shuffle state."


@app.route("/control", methods=["POST"])
def control():
    logging.debug("Control route hit")
    action = request.json.get("action")
    logging.debug(f"action token from body: {action}")
    access_token = request.headers.get("Authorization")
    logging.debug(f'access token from header: {access_token}')

    if not access_token:
        logging.error("Unauthorized: No access token.")
        return jsonify({"error": "Unauthorized, please log in"}), 401

    # Remove the "Bearer " part from the token if it's included in the header
    access_token = access_token.split(" ")[1] if "Bearer " in access_token else access_token

    logging.debug(f"Access token received: {access_token}")

    headers = {"Authorization": f"Bearer {access_token}"}

    # Fetch current loop state from Spotify API
    def get_current_loop_state(access_token):
        url = "https://api.spotify.com/v1/me/player"
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            loop_state = data.get("repeat_state", "off")  # Default to "off" if no state is found
            logging.debug(f"Current loop state: {loop_state}")
            return loop_state
        else:
            logging.error(f"Error fetching player state: {response.status_code}, {response.text}")
            return None

    loop_state = get_current_loop_state(access_token)

    if action == "Play":
        response = requests.put(f"{SPOTIFY_API_URL}/play", headers=headers)
    elif action == "Pause":
        response = requests.put(f"{SPOTIFY_API_URL}/pause", headers=headers)
    elif action == "Next":
        response = requests.post(f"{SPOTIFY_API_URL}/next", headers=headers)
    elif action == "Previous":
        response = requests.post(f"{SPOTIFY_API_URL}/previous", headers=headers)
    elif action in ["Volume Up", "Volume Down"]:
        current_volume_response = requests.get(SPOTIFY_API_URL, headers=headers)
        if current_volume_response.status_code != 200:
            logging.error(f"Failed to retrieve current playback info: {current_volume_response.status_code}")
            return jsonify({"error": "Unable to get current volume"}), 500
        current_volume = current_volume_response.json().get("device", {}).get("volume_percent", 50)
        logging.debug(f"Current volume: {current_volume}")
        # Adjust the volume
        if action == "Volume Up":
            new_volume = min(100, current_volume + 10)
        else:  # "Volume Down"
            new_volume = max(0, current_volume - 10)
        response = requests.put(f"{SPOTIFY_API_URL}/volume?volume_percent={new_volume}", headers=headers)
    elif action == "Shuffle":
        result = toggle_shuffle(access_token)
        return jsonify({"message": result}), 200
    elif action == "Loop":
        if loop_state == "off":
            loop_state = "context"
            logging.debug("Loop turned on for context")
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=context", headers=headers)
        elif loop_state == "context":
            loop_state = "track"
            logging.debug("Loop turned on for track")
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=track", headers=headers)
        elif loop_state == "track":
            loop_state = "off"
            logging.debug("Loop turned off")
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=off", headers=headers)
    else:
        logging.error("Unknown action. (python)")
        return jsonify({"error": "Unknown action"}), 400

    if response.status_code in (200, 204):
        logging.debug(f"Spotify action {action} executed successfully.")
        return jsonify({"status": "success"})
    else:
        logging.error(f"Failed Spotify action {action}: {response.status_code}")
        return jsonify({"error": "Spotify action failed"}), 500


@app.route("/validate-token", methods=["GET"])
def validate_token():
    access_token = session.get("access_token")
    if not access_token:
        logging.error("Unauthorized: No access token.")
        return jsonify({"error": "Unauthorized, please log in"}), 401

    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get("https://api.spotify.com/v1/me", headers=headers)

    if response.status_code == 200:
        user_info = response.json()
        logging.debug(f"Token is valid. User info: {user_info}")
        return jsonify({"status": "valid", "user": user_info})
    else:
        logging.error(f"Token validation failed: {response.status_code}")
        return jsonify({"status": "invalid", "error": response.json()}), response.status_code


if __name__ == "__main__":
    app.run(port=5001, debug=True)
