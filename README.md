# AI Based Traffic Management System

## Overview

This project is a web-based AI Traffic Monitoring system that leverages YOLOv8m for real-time object detection on video feeds. Users can upload videos through an interactive interface, track processing progress, preview outputs, and download the final results. The backend is powered by PyTorch, and the frontend features a modern, responsive design with real-time visual feedback.

## Features

   - Drag-and-drop video uploads
   - Visual step tracker (Upload → Processing → Done)
   - Original and processed video previews
   - Optional live camera feed preview
   - Responsive glassmorphism UI
   - YOLOv8m model-based detection (PyTorch backend)

## Project File Structure

```text
project-root/
├── app.py                  # Flask backend entry point
├── inputs/                 # Stores uploaded videos
├── modules/                # Contains detection model (.pt files)
├── outputs/                # Stores processed videos
├── static/                 # Frontend assets
│   ├── index.html
│   ├── script.js
│   └── style.css
├── utils/
│   └── video_processor.py  # Video processing and inference logic
```

## Requirements

Ensure you have Python 3.8 or above installed. Required libraries include:

- Flask
- torch
- torchvision
- opencv-python
- ultralytics
- numpy
- deepsort-realtime
- werkzeug

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ai-code-reviewer.git
   cd ai-traffic-monitor
   ```

2. **(Optional) Create and activate a virtual environment**:
   ```bash
   python -m venv venv # Use 'python3' if 'python' doesn't work
   
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install required packages**:
   ```bash
   pip install Flask torch torchvision opencv-python ultralytics numpy deepsort-realtime
   ```

4. **Add model files**:
   ```bash
   Place your .pt model files in the modules/ directory.
   ```

## Running the Application

Start the Flask app with:
  ```bash
python app.py
```
By default, the app runs at http://localhost:5000. Open it in your browser to use the interface.

## How It Works

   - User uploads a video via rag-and-drop or file input.

   - Flask saves the video to the `inputs/` directory.

   - The video is passed to the YOLOv8m-based detection pipeline in `video_processor.py`.
   
   - The processed video is saved to the `outputs/` directory

   - Progress is visually tracked via step indicators.

   - The user can preview the output or download it directly.


## Customization

### Model Integration:
   - Update `utils/video_processor.py` to integrate your own model logic or detection pipeline.

### Frontend Customization:
   - Modify files inside the `static/` directory to update the UI, change styles, or enhance interactivity.

### Live Preview (Optional):
   - Extend support for camera streams by modifying the Flask route and frontend `#livePreview` logic.


## Authors

- **Naveen Kumar M** 
- **Thanika M**
- **Muthu Selvan B**

## Contributing

This project is open for further improvements, suggestions, and collaboration. Feel free to fork the repository, open issues, or submit pull requests.