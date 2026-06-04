import { create } from 'zustand';

// ─────────────────────────────────────────────
// Tipos públicos exportados
// ─────────────────────────────────────────────

/** Estado cualitativo de cada métrica */
export type MetricStatus = 'ok' | 'warning' | 'danger';
export type AppTheme = 'dark' | 'light' | 'industrial';

/** Un registro histórico de una muestra del sensor */
export interface HistoryRecord {
  time: string;       // Timestamp formateado HH:MM:SS
  ph: number;
  density: number;
  turbidity: number;
}

/** Un evento de alerta individual registrado en el log */
export interface AlertEvent {
  id: string;           // UUID simple (time + Math.random)
  time: string;         // HH:MM:SS del momento de la alerta
  parameter: 'pH' | 'Densidad' | 'Turbidez';
  value: number;
  unit: string;
  status: MetricStatus; // 'warning' | 'danger'
}

/** Rango configurable para una sola métrica */
export interface MetricRange {
  min?: number;       // Límite inferior (opcional para turbidez que solo tiene max)
  max: number;        // Límite superior
}

/** Objeto completo de rangos de alerta configurables por el usuario */
export interface AlertRanges {
  ph: Required<MetricRange>;      // pH siempre tiene min y max
  density: Required<MetricRange>; // Densidad siempre tiene min y max
  turbidity: Pick<MetricRange, 'max'>; // Turbidez solo tiene umbral máximo
}

// ─────────────────────────────────────────────
// Definición del estado completo del store
// ─────────────────────────────────────────────

interface SensorState {
  // --- Lecturas actuales del sensor ---
  ph: number;
  density: number;
  turbidity: number;

  // --- Metadatos de conexión ---
  lastUpdated: Date | null;
  isConnected: boolean;
  isScanning: boolean;
  intervalId: ReturnType<typeof setInterval> | null;

  // --- Rangos de alerta configurables ---
  alertRanges: AlertRanges;

  // --- Historial para gráficas (máx. 24 registros) ---
  historyData: HistoryRecord[];

  // --- Log de eventos de alerta individuales (máx. 50) ---
  alertLog: AlertEvent[];

  // --- Contador acumulado de alertas detectadas ---
  totalAlerts: number;

  // --- Timestamp de inicio de sesión (para calcular tiempo operativo) ---
  sessionStart: Date | null,
  sessionStartTime: number | null,

  // --- Configuración de App ---
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  // --- Acciones ---
  connect: () => void;
  disconnect: () => void;
  updateAlertRanges: (newRanges: Partial<AlertRanges>) => void;
  clearAlertLog: () => void;
}

// ─────────────────────────────────────────────
// Rangos industriales por defecto
// ─────────────────────────────────────────────

const DEFAULT_ALERT_RANGES: AlertRanges = {
  ph:       { min: 6.5,  max: 8.5  },
  density:  { min: 0.995, max: 1.020 },
  turbidity: { max: 5.0 },
};

/** Máximo de registros que se guardan en el historial */
const MAX_HISTORY_LENGTH = 24;

// ─────────────────────────────────────────────
// Funciones de evaluación de calidad
// Ahora son dinámicas y reciben los rangos como parámetro
// para que reflejen los cambios del usuario en tiempo real.
// ─────────────────────────────────────────────

/**
 * Evalúa el pH contra los rangos configurados.
 * - ok      → dentro del rango [min, max]
 * - warning → dentro de una banda de tolerancia de ±0.5 fuera del rango
 * - danger  → fuera de la banda de tolerancia
 */
export const evaluatePh = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.ph,
): MetricStatus => {
  if (val >= range.min && val <= range.max) return 'ok';
  const tolerance = 0.5;
  if (val >= range.min - tolerance && val <= range.max + tolerance) return 'warning';
  return 'danger';
};

/**
 * Evalúa la densidad contra los rangos configurados.
 * - ok      → dentro del rango [min, max]
 * - warning → dentro de una banda de tolerancia de ±0.005
 * - danger  → fuera de la banda de tolerancia
 */
export const evaluateDensity = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.density,
): MetricStatus => {
  if (val >= range.min && val <= range.max) return 'ok';
  const tolerance = 0.005;
  if (val >= range.min - tolerance && val <= range.max + tolerance) return 'warning';
  return 'danger';
};

/**
 * Evalúa la turbidez contra el umbral máximo configurado.
 * - ok      → val ≤ max
 * - warning → val ≤ max * 4 (hasta 4× el límite)
 * - danger  → por encima de 4× el límite
 */
export const evaluateTurbidity = (
  val: number,
  range: Pick<MetricRange, 'max'> = DEFAULT_ALERT_RANGES.turbidity,
): MetricStatus => {
  if (val <= range.max) return 'ok';
  if (val <= range.max * 4) return 'warning';
  return 'danger';
};

// ─────────────────────────────────────────────
// Generadores de datos mock realistas
// ─────────────────────────────────────────────

/** Genera un pH con sesgo al rango neutro (6.0 – 10.0) */
const generatePh = (): number =>
  parseFloat((6.0 + Math.random() * 4.0).toFixed(2));

/** Genera densidad centrada en agua limpia (0.990 – 1.025) */
const generateDensity = (): number =>
  parseFloat((0.990 + Math.random() * 0.035).toFixed(3));

/** Genera turbidez con sesgo a valores bajos-medios (0 – 45 NTU) */
const generateTurbidity = (): number =>
  parseFloat((Math.random() * 45).toFixed(1));

/** Formatea un Date como HH:MM:SS para el historial */
const formatTime = (date: Date): string =>
  date.toLocaleTimeString('es-MX', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// ─────────────────────────────────────────────
// Store principal (Zustand)
// ─────────────────────────────────────────────

export const useSensorStore = create<SensorState>((set, get) => ({
  // ── Valores iniciales del sensor ──
  ph: 7.0,
  density: 1.0,
  turbidity: 0.0,
  lastUpdated: null,
  isConnected: false,
  isScanning: false,
  intervalId: null,

  // ── Configuración inicial ──
  alertRanges: DEFAULT_ALERT_RANGES,
  historyData: [],
  alertLog: [],
  totalAlerts: 0,
  sessionStart: null,
  sessionStartTime: null,
  theme: 'dark',

  setTheme: (theme: AppTheme) => set({ theme }),

  // ──────────────────────────────────────────
  // connect()
  // Inicia la simulación del stream Bluetooth.
  // Primero simula un "handshake" de ~1.5s y
  // luego emite datos cada 3 segundos.
  // ──────────────────────────────────────────
  connect: () => {
    const current = get();

    // Limpiar cualquier intervalo previo antes de reconectar
    if (current.intervalId) clearInterval(current.intervalId);

    set({ isScanning: true, isConnected: false });

    // Simular el handshake Bluetooth (~1.5s)
    const handshakeTimer = setTimeout(() => {
      // Registrar el inicio de la sesión
      const startTime = Date.now();
      set({ sessionStart: new Date(startTime), sessionStartTime: startTime });

      const id = setInterval(() => {
        const now = new Date();
        const { alertRanges, historyData, alertLog, totalAlerts } = get();
        const timeStr = formatTime(now);

        // 1. Generar nuevos valores del sensor
        const newPh = generatePh();
        const newDensity = generateDensity();
        const newTurbidity = generateTurbidity();

        // 2. Evaluar si cada valor está fuera de rango
        const phStatus = evaluatePh(newPh, alertRanges.ph);
        const densityStatus = evaluateDensity(newDensity, alertRanges.density);
        const turbidityStatus = evaluateTurbidity(newTurbidity, alertRanges.turbidity);

        // 3. Construir eventos de alerta individuales para el log
        const newAlerts: AlertEvent[] = [];
        if (phStatus !== 'ok') {
          newAlerts.push({
            id: `${timeStr}-ph-${Math.random().toString(36).slice(2, 6)}`,
            time: timeStr,
            parameter: 'pH',
            value: newPh,
            unit: '',
            status: phStatus,
          });
        }
        if (densityStatus !== 'ok') {
          newAlerts.push({
            id: `${timeStr}-den-${Math.random().toString(36).slice(2, 6)}`,
            time: timeStr,
            parameter: 'Densidad',
            value: newDensity,
            unit: 'g/cm³',
            status: densityStatus,
          });
        }
        if (turbidityStatus !== 'ok') {
          newAlerts.push({
            id: `${timeStr}-tur-${Math.random().toString(36).slice(2, 6)}`,
            time: timeStr,
            parameter: 'Turbidez',
            value: newTurbidity,
            unit: 'NTU',
            status: turbidityStatus,
          });
        }

        // 4. Construir nuevo registro histórico
        const newRecord: HistoryRecord = {
          time: timeStr,
          ph: newPh,
          density: newDensity,
          turbidity: newTurbidity,
        };

        // 5. Agregar al historial (máx 24) y al log de alertas (máx 50)
        const updatedHistory: HistoryRecord[] = [
          ...historyData.slice(-(MAX_HISTORY_LENGTH - 1)),
          newRecord,
        ];
        // Las alertas más recientes van al frente (orden cronológico inverso)
        const updatedAlertLog: AlertEvent[] = [
          ...newAlerts,
          ...alertLog,
        ].slice(0, 50);

        // 6. Actualizar todo el estado en un solo set (optimización de renders)
        set({
          ph: newPh,
          density: newDensity,
          turbidity: newTurbidity,
          lastUpdated: now,
          isConnected: true,
          isScanning: false,
          historyData: updatedHistory,
          alertLog: updatedAlertLog,
          totalAlerts: totalAlerts + newAlerts.length,
        });
      }, 3000);

      set({ intervalId: id });
    }, 1500);

    // Guardamos el timer del handshake para poder cancelarlo si el usuario
    // desconecta antes de que termine el handshake
    set({ intervalId: handshakeTimer as unknown as ReturnType<typeof setInterval> });
  },

  // ──────────────────────────────────────────
  // disconnect()
  // Limpia el intervalo, resetea las lecturas
  // del sensor pero conserva el historial y
  // el total de alertas acumuladas.
  // ──────────────────────────────────────────
  disconnect: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);

    set({
      isConnected: false,
      isScanning: false,
      intervalId: null,
      lastUpdated: null,
      sessionStart: null,
      sessionStartTime: null,
      // Resetear lecturas al estado inicial
      ph: 7.0,
      density: 1.0,
      turbidity: 0.0,
      // Nota: historyData, alertLog y totalAlerts se conservan intencionalmente
      // para que el usuario pueda revisar el historial tras desconectar.
    });
  },

  // ──────────────────────────────────────────
  // updateAlertRanges(newRanges)
  // Merge parcial: solo sobreescribe los campos
  // que el usuario cambia, preservando el resto.
  // ──────────────────────────────────────────
  updateAlertRanges: (newRanges: Partial<AlertRanges>) => {
    const current = get();
    set({
      alertRanges: {
        ph: { ...current.alertRanges.ph, ...newRanges.ph },
        density: { ...current.alertRanges.density, ...newRanges.density },
        turbidity: { ...current.alertRanges.turbidity, ...newRanges.turbidity },
      },
    });
  },

  // ──────────────────────────────────────────
  // clearAlertLog()
  // Limpia el log de alertas manualmente.
  // ──────────────────────────────────────────
  clearAlertLog: () => set({ alertLog: [], totalAlerts: 0 }),
}));
