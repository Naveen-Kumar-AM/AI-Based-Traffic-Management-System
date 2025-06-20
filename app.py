from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import uuid
import logging
from utils.video_processor import process_video_pipeline

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5000"}})

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
STATIC_FOLDER = 'static'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['STATIC_FOLDER'] = STATIC_FOLDER

@app.route('/')
def index():
    logger.debug("Serving index.html")
    return send_from_directory(STATIC_FOLDER, 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    logger.debug(f"Serving static file: {filename}")
    return send_from_directory(STATIC_FOLDER, filename)

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/live_feed')
def live_feed():
    logger.debug("Serving latest frame")
    frame_path = os.path.join(OUTPUT_FOLDER, "latest_frame.jpg")
    if os.path.exists(frame_path):
        return send_from_directory(OUTPUT_FOLDER, "latest_frame.jpg")
    return '', 204  # Return empty if no frame yet

@app.route('/process_video', methods=['POST'])
def process_video():
    logger.debug("Received process_video request")
    video_file = request.files.get('video')
    if not video_file:
        logger.error("No video file uploaded")
        return jsonify({"success": False, "message": "No video file uploaded"}), 400

    filename = secure_filename(video_file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    input_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    logger.debug(f"Saving video to: {input_path}")
    video_file.save(input_path)

    output_filename = f"processed_{unique_filename}"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    try:
        logger.debug("Starting video processing")
        success = process_video_pipeline(input_path, output_path)
        if success:
            logger.debug(f"Video processed successfully: {output_filename}")
            return jsonify({"success": True, "output_video": output_filename})
        else:
            logger.error("Video processing failed")
            return jsonify({"success": False, "message": "Error processing video"}), 500
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({"success": False, "message": f"Processing error: {str(e)}"}), 500
    finally:
        try:
            if os.path.exists(input_path):
                os.remove(input_path)
                logger.debug(f"Cleaned up input file: {input_path}")
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")

@app.route('/outputs/<filename>')
def output_file(filename):
    logger.debug(f"Serving output file: {filename}")
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)