from flask import Flask, request

app = Flask(__name__)

@app.route('/control', methods=['POST'])
def control_media():
    action = request.json.get('action')
    if action == "Play":
        print("Playing media")
    elif action == "Pause":
        print("Pausing media")
    elif action == "Next":
        print("Skipping to next")
    elif action == "Previous":
        print("Going to previous")
    return {"status": "success"}

if __name__ == "__main__":
    app.run(port=5000)
