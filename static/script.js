const videoInput = document.getElementById('videoUpload');
const uploadArea = document.getElementById('uploadArea');
const videoPreview = document.getElementById('videoPreview');
const processedVideo = document.getElementById('processedVideo');
const livePreview = document.getElementById('livePreview');
const liveFallback = document.getElementById('liveFallback');
const downloadLink = document.getElementById('downloadLink');
const analyzeButton = document.getElementById('analyzeButton');
const cancelButton = document.getElementById('cancelButton');
const statusDisplay = document.getElementById('status');
const videoContainer = document.getElementById('videoContainer');
const progressBar = document.getElementById('progressBar');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');

// Drag and Drop Upload
uploadArea.addEventListener('click', () => {
  if (uploadArea.classList.contains('disabled')) return;
  videoInput.click();
});

uploadArea.addEventListener('dragover', e => {
  if (uploadArea.classList.contains('disabled')) return;
  e.preventDefault();
  e.stopPropagation();
  uploadArea.style.border = '2px solid #007bff';
  uploadArea.style.backgroundColor = '#eaf4ff';
});

uploadArea.addEventListener('dragleave', e => {
  if (uploadArea.classList.contains('disabled')) return;
  e.preventDefault();
  e.stopPropagation();
  uploadArea.style.border = '2px dashed #ccc';
  uploadArea.style.backgroundColor = '#fff';
});

uploadArea.addEventListener('drop', e => {
  if (uploadArea.classList.contains('disabled')) return;
  e.preventDefault();
  e.stopPropagation();
  uploadArea.style.border = '2px dashed #ccc';
  uploadArea.style.backgroundColor = '#fff';

  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    videoInput.files = e.dataTransfer.files;
    handleFileUpload(file);
  }
});

videoInput.addEventListener('change', e => {
  if (uploadArea.classList.contains('disabled')) return;
  handleFileUpload(e.target.files[0]);
});

function handleFileUpload(file) {
  if (!file) return;

  videoPreview.src = '';
  processedVideo.src = '';
  progressBar.style.width = '0%';
  statusDisplay.textContent = '';

  const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const maxSizeMB = 200;
  const fileType = file.type;
  const fileSizeMB = file.size / (1024 * 1024);

  if (!validTypes.includes(fileType)) {
    alert('Invalid file type. Please upload a video (MP4, WebM, or Ogg).');
    return;
  }

  if (fileSizeMB > maxSizeMB) {
    alert(`File too large. Maximum allowed size is ${maxSizeMB} MB.`);
    return;
  }

  const fileURL = URL.createObjectURL(file);
  videoPreview.src = fileURL;
  videoPreview.style.display = 'block';
  videoContainer.style.display = 'flex';
  processedVideo.style.display = 'none';
  downloadLink.style.display = 'none';
  statusDisplay.textContent = '';
  clearSteps();

  statusDisplay.textContent = `Selected: ${file.name} (Queued for upload)`;

  uploadArea.classList.add('disabled');
  uploadArea.innerHTML = `
    <p><strong>Uploaded:</strong> ${file.name}</p>
    <p style="color: #64748b; font-size: 14px;">(Upload complete. Only one file allowed.)</p>
  `;
  videoInput.disabled = true;
}

// Live feed update
let liveFeedInterval = null;
function startLiveFeed() {
  console.log('Starting live feed');
  liveFallback.style.display = 'none'; // Hide fallback
  livePreview.src = '/live_feed?t=' + Date.now();
  liveFeedInterval = setInterval(() => {
    livePreview.src = '/live_feed?t=' + Date.now();
    console.log('Refreshing live feed');
  }, 1000);
}

function stopLiveFeed() {
  console.log('Stopping live feed');
  if (liveFeedInterval) {
    clearInterval(liveFeedInterval);
    liveFeedInterval = null;
  }
  livePreview.src = ''; // Clear live feed image
  liveFallback.style.display = 'none'; // Ensure fallback is hidden
}

// Step looping for Helmet, Vehicle, ANPR
let stepLoopInterval = null;
function startStepLoop() {
  const steps = [step2, step3, step4];
  let currentStep = 0;
  stepLoopInterval = setInterval(() => {
    steps.forEach((step, index) => {
      setStepStatus(step, index === currentStep ? 'processing' : '', index === currentStep ? 'Processing...' : `${index + 2}`);
    });
    currentStep = (currentStep + 1) % steps.length;
  }, 2000); // Cycle every 2 seconds
}

function stopStepLoop() {
  if (stepLoopInterval) {
    clearInterval(stepLoopInterval);
    stepLoopInterval = null;
  }
}

// Analyze button
analyzeButton.addEventListener('click', () => {
  console.log('Analyze button clicked');
  const file = videoInput.files[0];
  if (!file) {
    console.log('No file selected');
    alert('Please select a video file first!');
    statusDisplay.textContent = 'Error: No file selected.';
    return;
  }

  console.log('Preparing to upload:', file.name);
  const formData = new FormData();
  formData.append('video', file);

  statusDisplay.textContent = 'Uploading video...';
  setStepStatus(step1, 'processing', 'Uploading...');
  progressBar.style.width = '0%';
  startLiveFeed();
  startStepLoop(); // Start looping Helmet, Vehicle, ANPR

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/process_video', true);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 50); // Scale to 0-50%
      progressBar.style.width = `${percent}%`;
      statusDisplay.textContent = `Uploading video... ${percent}%`;
      console.log(`Upload progress: ${percent}%`);
      if (percent === 50) {
        setStepStatus(step1, 'completed', 'Uploaded');
      }
    }
  };

  xhr.onload = () => {
    stopLiveFeed();
    stopStepLoop();
    console.log('XHR onload, status:', xhr.status);

    // Simulate processing progress from 50% to 100%
    let progress = 50;
    const progressInterval = setInterval(() => {
      progress += 5;
      progressBar.style.width = `${progress}%`;
      statusDisplay.textContent = `Processing video... ${progress}%`;
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 500); // Increment every 500ms

    if (xhr.status === 200) {
      try {
        const data = JSON.parse(xhr.responseText);
        console.log('Response data:', data);
        if (data.success && data.output_video) {
          setStepStatus(step1, 'completed', 'Uploaded');
          setStepStatus(step2, 'completed', 'Helmet ✔');
          setStepStatus(step3, 'completed', 'Vehicle ✔');
          setStepStatus(step4, 'completed', 'ANPR ✔');

          const outputPath = `/outputs/${data.output_video}`;
          processedVideo.src = outputPath;
          processedVideo.style.display = 'block';
          downloadLink.href = outputPath;
          downloadLink.style.display = 'inline-block';
          statusDisplay.textContent = 'Video processed successfully!';
          progressBar.style.width = '100%';
          console.log('Processed video set:', outputPath);
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (err) {
        console.error('Response error:', err);
        statusDisplay.textContent = `Error: ${err.message}`;
        resetStepsToError();
      }
    } else {
      console.error('Server error:', xhr.status, xhr.responseText);
      statusDisplay.textContent = `Server error: ${xhr.status}`;
      resetStepsToError();
    }
  };

  xhr.onerror = () => {
    stopLiveFeed();
    stopStepLoop();
    console.error('Network error');
    statusDisplay.textContent = 'Network error. Please check your connection.';
    resetStepsToError();
  };

  console.log('Sending XHR request');
  xhr.send(formData);
});

// Cancel button
cancelButton.addEventListener('click', () => {
  stopLiveFeed();
  stopStepLoop();
  uploadArea.classList.remove('disabled');
  uploadArea.innerHTML = `<p>Drag & drop video here or click to upload</p>`;
  videoInput.disabled = false;
  videoInput.value = '';
  videoPreview.src = '';
  videoPreview.style.display = 'none';
  processedVideo.src = '';
  processedVideo.style.display = 'none';
  downloadLink.style.display = 'none';
  videoContainer.style.display = 'none';
  progressBar.style.width = '0%';
  statusDisplay.textContent = '';
  livePreview.src = ''; // Clear live feed
  liveFallback.style.display = 'none'; // Hide fallback
  clearSteps();
});

// Step Handling
function setStepStatus(el, status, text) {
  el.classList.remove('processing', 'completed');
  if (status) el.classList.add(status);
  el.querySelector('span').textContent = text;
}

function clearSteps() {
  setStepStatus(step1, '', '1');
  setStepStatus(step2, '', '2');
  setStepStatus(step3, '', '3');
  setStepStatus(step4, '', '4');
}

function resetStepsToError() {
  [step1, step2, step3, step4].forEach(step => {
    step.classList.remove('processing', 'completed');
    step.querySelector('span').textContent = step.id.replace('step', '');
  });
}

// Live preview handling
livePreview.classList.add('loading');
livePreview.onload = () => {
  livePreview.classList.remove('loading');
  liveFallback.style.display = 'none'; // Hide fallback on load
};
livePreview.onerror = () => {
  console.log('Live feed error');
  statusDisplay.textContent = 'Live feed unavailable.';
  livePreview.classList.remove('loading');
  liveFallback.style.display = 'none'; // Hide fallback on error
};