// Webcam + detecção de pose. Guarda os pontos do corpo mais recentes de até 2 pessoas.
import { opcoes } from '../config.js';

const CAMINHO = './vendor/mediapipe';

export class CameraPose {
  constructor() {
    this.estado = 'desligada'; // desligada | carregando | pronta | erro
    this.erro = '';
    this.poses = [];
    this.tempo = 0;
    this.aspecto = 16 / 9;
    this.video = document.getElementById('camera-video');
    this.ultimoTempoVideo = -1;
    this.atribuicao = [];
    this.rotulos = [];
    this.numPoses = 2;
    this.pausada = false;
    this.fila = []; // resultados ainda não lidos pelo jogo: { tempo, poses }
    this.ultimoCarimbo = 0;
    this.delegate = '';
    this.placa = '';
    // medidas da janela de 1 s, para o painel F2 e o registro
    this.quadros = 0;
    this.fps = 0; // detecções por segundo
    this.fpsCamera = 0; // quadros novos da câmera por segundo
    this.msDeteccao = 0; // tempo médio de uma detecção
    this.msDeteccaoMax = 0;
    this.msAtraso = 0; // da captura do quadro ao fim da detecção
    this._janela = this._janelaVazia();
    this._tFps = performance.now();
  }

  _janelaVazia() {
    return { deteccoes: 0, quadros: 0, ms: 0, msMax: 0, atraso: 0, comAtraso: 0 };
  }

  async iniciar() {
    if (this.estado === 'carregando' || this.estado === 'pronta') return;
    this.estado = 'carregando';
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 30 }, facingMode: 'user' },
        audio: false,
      });
      this.video.srcObject = fluxo;
      await this.video.play();
      this.aspecto = (this.video.videoWidth || 16) / (this.video.videoHeight || 9);

      const { FilesetResolver, PoseLandmarker } = await import(`../../${CAMINHO}/vision_bundle.mjs`);
      const arquivos = await FilesetResolver.forVisionTasks(`${CAMINHO}/wasm`);
      const usado = this.numPoses;
      const criar = (delegate) =>
        PoseLandmarker.createFromOptions(arquivos, {
          baseOptions: { modelAssetPath: `${CAMINHO}/pose_landmarker_${opcoes.precisao === 'alta' ? 'full' : 'lite'}.task`, delegate },
          runningMode: 'VIDEO',
          numPoses: usado,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        this.detector = await criar('GPU');
        this.delegate = 'GPU';
      } catch {
        this.detector = await criar('CPU');
        this.delegate = 'CPU';
      }
      this.placa = nomeDaPlaca();
      // o número de jogadores mudou enquanto o detector carregava
      if (this.numPoses !== usado) await this.detector.setOptions({ numPoses: this.numPoses });
      this.estado = 'pronta';
      // Detecta uma vez por quadro novo da câmera, fora do laço do jogo.
      if (this.video.requestVideoFrameCallback) {
        let apresentados = null;
        const aoQuadro = (agora, meta) => {
          // presentedFrames também conta os quadros pulados enquanto a detecção rodava
          this._janela.quadros += apresentados === null ? 1 : Math.max(1, meta.presentedFrames - apresentados);
          apresentados = meta.presentedFrames;
          this.detectar(meta.captureTime || agora);
          this.video.requestVideoFrameCallback(aoQuadro);
        };
        this.video.requestVideoFrameCallback(aoQuadro);
      }
    } catch (e) {
      console.error(e);
      this.estado = 'erro';
      this.erro = e && e.name === 'NotAllowedError' ? 'PERMISSÃO NEGADA' : 'CÂMERA NÃO ENCONTRADA';
    }
  }

  // Muda o número máximo de corpos. Com 1, o MediaPipe só procura uma pessoa nova quando perde
  // a que segue; com 2 e uma pessoa só, ele procura a segunda em todo quadro (fica bem mais lento).
  async definirPoses(n) {
    if (n === this.numPoses) return;
    this.numPoses = n;
    if (!this.detector) return;
    this.ajustando = true;
    try {
      await this.detector.setOptions({ numPoses: n });
    } finally {
      this.ajustando = false;
    }
  }

  // Roda a detecção num quadro. `captura` = momento da captura (ms, mesma base de performance.now).
  detectar(captura) {
    if (this.estado !== 'pronta' || this.pausada || this.ajustando || this.video.readyState < 2) return;
    // o MediaPipe exige carimbos de tempo crescentes
    const carimbo = Math.max(captura, this.ultimoCarimbo + 0.01);
    this.ultimoCarimbo = carimbo;
    const inicio = performance.now();
    let poses = null;
    this.detector.detectForVideo(this.video, carimbo, (r) => {
      poses = (r.landmarks || []).map((pts) => pts.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility ?? 1 })));
    });
    const fim = performance.now();
    if (!poses) return;
    this.poses = poses;
    this.tempo = carimbo / 1000;
    this.fila.push({ tempo: this.tempo, poses });
    if (this.fila.length > 8) this.fila.shift();
    this.quadros++;

    const j = this._janela;
    j.deteccoes++;
    j.ms += fim - inicio;
    j.msMax = Math.max(j.msMax, fim - inicio);
    if (captura < inicio) {
      j.atraso += fim - captura;
      j.comAtraso++;
    }
    if (fim - this._tFps > 1000) {
      this.fps = j.deteccoes;
      this.fpsCamera = j.quadros;
      this.msDeteccao = j.ms / j.deteccoes;
      this.msDeteccaoMax = j.msMax;
      this.msAtraso = j.comAtraso ? j.atraso / j.comAtraso : 0;
      this._janela = this._janelaVazia();
      this._tFps = fim;
    }
  }

  // Chamar a cada quadro do jogo. Devolve os resultados novos desde a última chamada, em ordem.
  processar() {
    if (this.estado !== 'pronta') return [];
    if (!this.video.requestVideoFrameCallback && this.video.currentTime !== this.ultimoTempoVideo) {
      // navegador sem callback de quadro: verifica o tempo do vídeo
      this.ultimoTempoVideo = this.video.currentTime;
      this._janela.quadros++;
      this.detectar(performance.now());
    }
    const novos = this.fila;
    this.fila = [];
    return novos;
  }
}

// Nome da placa de vídeo que o navegador usa para o WebGL (para saber se a detecção usa a placa certa).
function nomeDaPlaca() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl ? gl.getParameter(gl.RENDERER) : 'sem WebGL2';
  } catch {
    return '?';
  }
}
