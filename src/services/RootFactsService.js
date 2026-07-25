import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }


  // TODO [Basic] Muat model dan inisialisasi pipeline text2text-generation
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async loadModel() {
    const { pipeline } = await import('@huggingface/transformers');

    this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M');
    this.isModelLoaded = true;

    return this.generator;
  }

  // TODO [Advance] Konfigurasi tone fakta yang dihasilkan
  setTone(tone) {
    if (tone) {
      this.currentTone = tone;
    }
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  // TODO [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
  // TODO [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
  async generateFacts(vegetableName, tone = this.currentTone) {
    if (!this.isReady()) {
      throw new Error('Generator fakta belum siap');
    }

    this.isGenerating = true;

    try {
      const prompt = `Berikan satu fakta menarik dan singkat tentang sayuran ${vegetableName} dalam satu kalimat dengan nada ${tone}.`;

      const output = await this.generator(prompt, {
        max_new_tokens: 60,
        temperature: 0.8,
        top_k: 50,
        repetition_penalty: 1.3,
        do_sample: true,
      });

      const factText = output?.[0]?.generated_text?.trim();

      return factText || null;
    } finally {
      this.isGenerating = false;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }

}
