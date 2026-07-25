
export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.cameras = []; 
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  // TODO [Basic] Dapatkan constraints kamera berdasarkan konfigurasi dan kamera yang dipilih
  async loadCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.cameras = devices.filter((device) => device.kind === 'videoinput');
    this.config = { cameras: this.cameras };
    return this.cameras;
  }

  getCameraConstraints(selectedCameraId) {
    const videoConstraints = {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: this.fps ?? 30 },
    };

    const isKnownDeviceId = this.cameras.some(
      (device) => device.deviceId === selectedCameraId,
    );

    if (selectedCameraId && isKnownDeviceId) {
      videoConstraints.deviceId = { exact: selectedCameraId };
    } else {
      videoConstraints.facingMode = selectedCameraId === 'front' ? 'user' : 'environment';
    }

    return { video: videoConstraints, audio: false };
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(selectedCameraId) {
    if (this.stream) {
      this.stopCamera();
    }

    if (this.cameras.length === 0) {
      await this.loadCameras();
    }

    const constraints = this.getCameraConstraints(selectedCameraId);
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (this.video) {
      this.video.srcObject = this.stream;
      await this.video.play();
    }

    return this.stream;
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    this.fps = fps;

    if (this.stream) {
      const [videoTrack] = this.stream.getVideoTracks();
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        videoTrack.applyConstraints({ frameRate: { ideal: fps } }).catch(() => {
        });
      }
    }
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return Boolean(this.stream) && this.stream.getVideoTracks().some(
      (track) => track.readyState === 'live',
    );
  }

  // TODO [Basic] Periksa apakah elemen video siap untuk digunakan
  isReady() {
    return Boolean(this.video) && this.video.readyState >= 2 && this.video.videoWidth > 0;
  }
}