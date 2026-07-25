import * as tf from '@tensorflow/tfjs';

const MODEL_URL = '/model/model.json';
const METADATA_URL = '/model/metadata.json';
const IMAGE_SIZE = 224; // sesuai metadata.json (imageSize: 224)

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
  }


  // TODO [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel() {
    await tf.ready();

    const [model, metadata] = await Promise.all([
      tf.loadLayersModel(MODEL_URL),
      fetch(METADATA_URL).then((response) => response.json()),
    ]);

    this.model = model;
    this.labels = metadata.labels || [];
    this.config = metadata;

    // Warm-up agar prediksi pertama tidak lambat
    tf.tidy(() => {
      const warmupInput = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
      this.model.predict(warmupInput);
    });

    return this.model;
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  async predict(imageElement) {
    if (!this.isLoaded()) {
      throw new Error('Model deteksi belum dimuat');
    }

    const prediction = tf.tidy(() => {
      const tensor = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);

      return this.model.predict(tensor);
    });

    const scores = await prediction.data();
    prediction.dispose();

    let maxScore = 0;
    let maxIndex = 0;

    scores.forEach((score, index) => {
      if (score > maxScore) {
        maxScore = score;
        maxIndex = index;
      }
    });

    return {
      className: this.labels[maxIndex] || 'Tidak diketahui',
      score: maxScore,
      confidence: Math.round(maxScore * 100),
      isValid: true,
    };
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isLoaded() {
    return this.model !== null;
  }
}
