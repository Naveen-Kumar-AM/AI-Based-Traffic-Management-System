import cv2
from ultralytics import YOLO
import os
import logging
import torch
from deep_sort_realtime.deepsort_tracker import DeepSort

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "../modules")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "../outputs")

try:
    logger.debug("Loading YOLO models")
    helmet_model = YOLO(os.path.join(MODEL_DIR, "helmet_detection.pt"))
    vehicle_model = YOLO(os.path.join(MODEL_DIR, "vehicle_detection.pt"))
    anpr_model = YOLO(os.path.join(MODEL_DIR, "anpr.pt"))
    logger.debug("YOLO models loaded successfully")
except Exception as e:
    logger.error(f"Failed to load YOLO models: {str(e)}")
    raise

# Initialize DeepSORT tracker for vehicle tracking with tuned parameters
try:
    logger.debug("Initializing DeepSORT tracker")
    tracker = DeepSort(
        max_age=15,           # Reduce to drop stale tracks faster
        n_init=5,             # Require more detections to confirm a track
        nn_budget=50,         # Smaller budget to limit feature storage
        max_iou_distance=0.7, # Tighter IOU for matching detections
        nms_max_overlap=0.5   # Stricter NMS to reduce duplicate boxes
    )
    logger.debug("DeepSORT tracker initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize DeepSORT tracker: {str(e)}")
    raise

def process_video_pipeline(video_path, output_path):
    try:
        logger.debug(f"Opening video: {video_path}")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video: {video_path}")
            return False

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        logger.debug(f"Video specs: {width}x{height}, {fps} FPS")

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (640, 640))
        if not out.isOpened():
            logger.error(f"Failed to initialize VideoWriter: {output_path}")
            cap.release()
            return False

        frame_count = 0
        latest_frame_path = os.path.join(OUTPUT_FOLDER, "latest_frame.jpg")

        device = "mps" if torch.backends.mps.is_available() else "cpu"

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                logger.debug("End of video reached")
                break

            frame_count += 1
            logger.debug(f"Processing frame {frame_count}")

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_resized = cv2.resize(frame_rgb, (640, 640))

            # Helmet detection
            helmet_results = helmet_model.predict(frame_resized, conf=0.1, device=device)
            annotated_frame = helmet_results[0].plot() if helmet_results else frame_resized
            logger.debug("Helmet detection completed")

            # Vehicle detection
            vehicle_results = vehicle_model.predict(annotated_frame, conf=0.1, device=device)
            annotated_frame = vehicle_results[0].plot() if vehicle_results else annotated_frame
            logger.debug("Vehicle detection completed")

            # Prepare detections for DeepSORT (only for vehicles)
            detections = []
            if vehicle_results:
                for box in vehicle_results[0].boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = box.conf[0].item()
                    bbox = [x1, y1, x2 - x1, y2 - y1]  # Convert to (x, y, width, height)
                    detections.append((bbox, conf, "vehicle"))

            # Update DeepSORT tracker
            tracked_objects = tracker.update_tracks(detections, frame=annotated_frame)
            logger.debug("DeepSORT tracking completed")

            # Draw DeepSORT-tracked bounding boxes and IDs
            for track in tracked_objects:
                if not track.is_confirmed():
                    continue
                track_id = track.track_id
                ltrb = track.to_ltrb()  # Get bounding box
                x1, y1, x2, y2 = map(int, ltrb)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)  # Red for DeepSORT
                cv2.putText(annotated_frame, f"ID {track_id}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            # ANPR detection
            anpr_results = anpr_model.predict(annotated_frame, conf=0.1, device=device)
            annotated_frame = anpr_results[0].plot() if anpr_results else annotated_frame
            logger.debug("ANPR detection completed")

            frame_bgr = cv2.cvtColor(annotated_frame, cv2.COLOR_RGB2BGR)
            cv2.imwrite(latest_frame_path, frame_bgr)
            logger.debug(f"Saved latest frame: {latest_frame_path}")

            out.write(frame_bgr)

        cap.release()
        out.release()
        logger.debug(f"Video processing completed: {output_path}")
        return True
    except cv2.error as cv2_err:
        logger.error(f"OpenCV error: {str(cv2_err)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False