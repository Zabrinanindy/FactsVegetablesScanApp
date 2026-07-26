import { useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { DetectionService } from './services/DetectionService';
import { CameraService } from './services/CameraService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG, isValidDetection } from './utils/config';
import { logError, getCameraErrorMessage, createDelay } from './utils/common';

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW terdaftar:', registration);
      })
      .catch((error) => {
        console.log('Pendaftaran SW gagal:', error);
      });
  }
}

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');
  const [selectedCameraType, setSelectedCameraType] = useState('default');

  useEffect(() => {
    registerServiceWorker();

    const detector = new DetectionService();
    const camera = new CameraService();
    const generator = new RootFactsService();

    actions.setServices({ detector, camera, generator });

    let isMounted = true;

    (async () => {
      try {
        await Promise.all([
          detector.loadModel(),
          generator.loadModel((status, percent) => {
            if (isMounted) {
              actions.setModelStatus(percent < 100 ? `${status} (${percent}%)` : status);
            }
          }),
        ]);
        if (isMounted) {
          actions.setModelStatus('Model AI Siap');
        }
      } catch (error) {
        logError('Gagal memuat model AI', error);
        if (isMounted) {
          actions.setModelStatus('Gagal memuat model');
          actions.setError('Gagal memuat model AI. Silakan muat ulang halaman.');
        }
      }
    })();

    // TODO [Basic] Bersihkan sumber daya saat komponen ditinggalkan
    return () => {
      isMounted = false;
      isRunningRef.current = false;
      if (detectionCleanupRef.current) {
        clearTimeout(detectionCleanupRef.current);
      }
      camera.stopCamera();
    };
  }, [actions]);

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = useCallback(async () => {
    const { detector, camera, generator } = state.services;
    if (!isRunningRef.current || !detector || !camera) return;

    if (!camera.isReady()) {
      detectionCleanupRef.current = setTimeout(
        startDetectionLoop,
        APP_CONFIG.detectionRetryInterval,
      );
      return;
    }

    try {
      const result = await detector.predict(camera.video);

      if (isValidDetection(result)) {
        isRunningRef.current = false;
        camera.stopCamera();
        actions.setRunning(false);
        actions.setDetectionResult(result);
        actions.setAppState('analyzing');
        actions.setFunFactData(null);

        await createDelay(APP_CONFIG.factsGenerationDelay);

        try {
          generator.setTone(currentTone);
          const fact = await generator.generateFacts(result.className);
          actions.setFunFactData(fact || 'error');
        } catch (error) {
          logError('Gagal membuat fakta menarik', error);
          actions.setFunFactData('error');
        }

        actions.setAppState('result');
        return;
      }
    } catch (error) {
      logError('Gagal melakukan deteksi', error);
    }

    if (isRunningRef.current) {
      detectionCleanupRef.current = setTimeout(
        startDetectionLoop,
        APP_CONFIG.detectionRetryInterval,
      );
    }
  }, [state.services, actions, currentTone]);

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = async (cameraType) => {
    const { camera } = state.services;
    if (!camera) return;

    if (state.isRunning) {
      isRunningRef.current = false;
      if (detectionCleanupRef.current) {
        clearTimeout(detectionCleanupRef.current);
      }
      camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
      return;
    }

    try {
      actions.resetResults();
      actions.setAppState('analyzing');
      await camera.startCamera(cameraType);
      actions.setRunning(true);
      isRunningRef.current = true;
      startDetectionLoop();
    } catch (error) {
      logError('Gagal memulai kamera', error);
      actions.setError(getCameraErrorMessage(error));
    }
  };

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan

  // TODO [Skilled] Fungsi untuk menyalin fakta ke clipboard
  const handleCopyFact = async () => {
    if (!state.funFactData || state.funFactData === 'error') return;

    try {
      await navigator.clipboard.writeText(state.funFactData);
    } catch (error) {
      logError('Gagal menyalin fakta ke clipboard', error);
    }
  };

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={() => handleToggleCamera(selectedCameraType)}
          selectedCameraType={selectedCameraType}
          onCameraTypeChange={setSelectedCameraType}
          onToneChange={setCurrentTone}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
