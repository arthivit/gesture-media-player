import os
import requests
from flask import Flask, request, redirect, jsonify, session, send_from_directory
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
MODEL_DIR = os.path.join(os.getcwd(), '../../public/model')

logging.debug(f"Client ID: {CLIENT_ID}")
logging.debug(f"Client Secret: {CLIENT_SECRET}")

app.secret_key = os.getenv("SESSION_SECRET_KEY")

@app.route("/model/<filename>")
def serve_model(filename):
    try:
        return send_from_directory(MODEL_DIR, filename)
    except Exception as e:
        logging.error(f"Error serving model file: {e}")
        return jsonify({"error": "Model file not found"}), 404

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

@app.route("/control", methods=["POST"])
def control():
    logging.debug("Control route hit")
    action = request.json.get("action")
    logging.debug(f"Action received: {action}")
    access_token = request.headers.get("Authorization")
    logging.debug(f"Access token from header: {access_token}")

    if not access_token:
        logging.error("Unauthorized: No access token.")
        return jsonify({"error": "Unauthorized, please log in"}), 401

    access_token = access_token.split(" ")[1] if "Bearer " in access_token else access_token

    logging.debug(f"Access token received: {access_token}")

    headers = {"Authorization": f"Bearer {access_token}"}

    # Handling actions based on the received gesture
    if action == "PlayPause":
        # Toggle Play/Pause
        response = requests.put(f"{SPOTIFY_API_URL}/play", headers=headers)
        if response.status_code != 200:
            response = requests.put(f"{SPOTIFY_API_URL}/pause", headers=headers)

    elif action == "Next":
        response = requests.post(f"{SPOTIFY_API_URL}/next", headers=headers)

    elif action == "Previous":
        response = requests.post(f"{SPOTIFY_API_URL}/previous", headers=headers)

    elif action == "Volume Up":
        current_volume_response = requests.get(SPOTIFY_API_URL, headers=headers)
        if current_volume_response.status_code != 200:
            logging.error(f"Failed to retrieve current playback info: {current_volume_response.status_code}")
            return jsonify({"error": "Unable to get current volume"}), 500
        current_volume = current_volume_response.json().get("device", {}).get("volume_percent", 50)
        new_volume = min(100, current_volume + 10)
        response = requests.put(f"{SPOTIFY_API_URL}/volume?volume_percent={new_volume}", headers=headers)

    elif action == "Volume Down":
        current_volume_response = requests.get(SPOTIFY_API_URL, headers=headers)
        if current_volume_response.status_code != 200:
            logging.error(f"Failed to retrieve current playback info: {current_volume_response.status_code}")
            return jsonify({"error": "Unable to get current volume"}), 500
        current_volume = current_volume_response.json().get("device", {}).get("volume_percent", 50)
        new_volume = max(0, current_volume - 10)
        response = requests.put(f"{SPOTIFY_API_URL}/volume?volume_percent={new_volume}", headers=headers)

    elif action == "Shuffle":
        current_shuffle = get_current_shuffle_state(access_token)
        new_state = not current_shuffle
        response = requests.put(f"{SPOTIFY_API_URL}/shuffle?state={new_state}", headers=headers)

    elif action == "Loop":
        loop_state = get_current_loop_state(access_token)
        if loop_state == "off":
            loop_state = "context"
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=context", headers=headers)
        elif loop_state == "context":
            loop_state = "track"
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=track", headers=headers)
        else:
            loop_state = "off"
            response = requests.put(f"{SPOTIFY_API_URL}/repeat?state=off", headers=headers)

    elif action == "Nothing":
        logging.debug("No action performed.")

    else:
        logging.error(f"Unknown action: {action}")
        return jsonify({"error": "Unknown action"}), 400

    if response.status_code in (200, 204):
        logging.debug(f"Spotify action {action} executed successfully.")
        return jsonify({"status": "success"})
    else:
        logging.error(f"Failed Spotify action {action}: {response.status_code}")
        return jsonify({"error": "Spotify action failed"}), 500


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

def get_current_loop_state(access_token):
    url = "https://api.spotify.com/v1/me/player"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        loop_state = data.get("repeat_state", "off")
        logging.debug(f"Current loop state: {loop_state}")
        return loop_state
    else:
        logging.error(f"Error fetching player state: {response.status_code}, {response.text}")
        return None


if __name__ == "__main__":
    app.run(port=5001, debug=True)
