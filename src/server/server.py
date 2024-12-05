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
            "scope": "user-library-read user-read-playback-state user-modify-playback-state",
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
        # Assuming your app is running on localhost:3000
        redirect_url = f"http://localhost:3000?access_token={access_token}&refresh_token={refresh_token}"
        return redirect(redirect_url)

    else:
        logging.error(f"Error retrieving tokens: {response.json()}")
        return jsonify({"error": "Unable to get token"}), 400



@app.route("/control", methods=["POST"])
def control():
    logging.debug("Control route hit")
    action = request.json.get("action")
    access_token = session.get("access_token")

    if not access_token:
        logging.error("Unauthorized: No access token.")
        return jsonify({"error": "Unauthorized, please log in"}), 401

    headers = {"Authorization": f"Bearer {access_token}"}

    if action == "Play":
        response = requests.put(f"{SPOTIFY_API_URL}/play", headers=headers)
    elif action == "Pause":
        response = requests.put(f"{SPOTIFY_API_URL}/pause", headers=headers)
    elif action == "Next":
        response = requests.post(f"{SPOTIFY_API_URL}/next", headers=headers)
    elif action == "Previous":
        response = requests.post(f"{SPOTIFY_API_URL}/previous", headers=headers)
    else:
        logging.error("Unknown action.")
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
