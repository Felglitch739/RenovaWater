import { create } from 'zustand';

// ─────────────────────────────────────────────
// Tipos públicos exportados
// ─────────────────────────────────────────────

/** Estado cualitativo de cada métrica */
export type MetricStatus = 'ok' | 'warning' | 'danger';
export type AppTheme = 'dark' | 'light';

/** Un registro histórico de una muestra del sensor */
export interface HistoryRecord {
  time: string;       // Timestamp formateado HH:MM:SS
  ph: number;
  temperature: number;
  turbidity: number;
}

/** Un evento de alerta individual registrado en el log */
export interface AlertEvent {
  id: string;           // UUID simple (time + Math.random)
  time: string;         // HH:MM:SS del momento de la alerta
  parameter: 'pH' | 'Temperatura' | 'Turbidez';
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
  ph: Required<MetricRange>;          // pH siempre tiene min y max
  temperature: Required<MetricRange>; // Temperatura (°C) tiene min y max
  turbidity: Pick<MetricRange, 'max'>; // Turbidez solo tiene umbral máximo
}

// ─────────────────────────────────────────────
// Definición del estado completo del store
// ─────────────────────────────────────────────

interface SensorState {
  // --- Lecturas actuales del sensor ---
  ph: number;
  temperature: number;
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
  sessionStart: Date | null;
  sessionStartTime: number | null;

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
  ph:          { min: 6.5,  max: 8.5  },
  temperature: { min: 18.0, max: 28.0 },
  turbidity:   { max: 5.0 },
};

/** Máximo de registros que se guardan en el historial */
const MAX_HISTORY_LENGTH = 24;

// ─────────────────────────────────────────────
// Funciones de evaluación de calidad
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
 * Evalúa la temperatura contra los rangos configurados.
 * - ok      → dentro del rango [min, max] (ej. 18°C a 28°C)
 * - warning → dentro de tolerancia de ±2.5°C
 * - danger  → fuera de tolerancia
 */
export const evaluateTemperature = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.temperature,
): MetricStatus => {
  if (val >= range.min && val <= range.max) return 'ok';
  const tolerance = 2.5;
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

/** Genera un pH con sesgo al rango neutro (6.0 – 9.8) */
const generatePh = (): number =>
  parseFloat((6.2 + Math.random() * 3.4).toFixed(2));

/** Genera temperatura centrada en agua ambiente/potable (17.0°C – 31.0°C) */
const generateTemperature = (): number =>
  parseFloat((17.5 + Math.random() * 13.0).toFixed(1));

/** Genera turbidez con sesgo a valores bajos-medios (0 – 42 NTU) */
const generateTurbidity = (): number =>
  parseFloat((Math.random() * 42).toFixed(1));

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
  ph: 7.2,
  temperature: 23.4,
  turbidity: 1.2,
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
  // ──────────────────────────────────────────
  connect: () => {
    const { intervalId } = get();

    if (intervalId) {
      clearInterval(intervalId);
      clearTimeout(intervalId);
    }

    set({ isScanning: true, isConnected: false });

    // Handshake de 150ms
    const handshakeTimer = setTimeout(() => {
      const startTime = Date.now();
      const now = new Date(startTime);
      const timeStr = formatTime(now);

      const initialPh = generatePh();
      const initialTemp = generateTemperature();
      const initialTurbidity = generateTurbidity();

      const initialRecord: HistoryRecord = {
        time: timeStr,
        ph: initialPh,
        temperature: initialTemp,
        turbidity: initialTurbidity,
      };

      const freshState = get();

      set({
        ph: initialPh,
        temperature: initialTemp,
        turbidity: initialTurbidity,
        lastUpdated: now,
        sessionStart: now,
        sessionStartTime: startTime,
        isConnected: true,
        isScanning: false,
        historyData: freshState.historyData.length > 0 ? freshState.historyData : [initialRecord],
      });

      const id = setInterval(() => {
        const timeNow = new Date();
        const { alertRanges, historyData, alertLog, totalAlerts } = get();
        const timeFormatted = formatTime(timeNow);

        // 1. Generar nuevos valores del sensor
        const newPh = generatePh();
        const newTemp = generateTemperature();
        const newTurbidity = generateTurbidity();

        // 2. Evaluar estado de cada parámetro
        const phStatus = evaluatePh(newPh, alertRanges.ph);
        const tempStatus = evaluateTemperature(newTemp, alertRanges.temperature);
        const turbidityStatus = evaluateTurbidity(newTurbidity, alertRanges.turbidity);

        // 3. Construir eventos de alerta si están fuera de rango
        const newAlerts: AlertEvent[] = [];
        if (phStatus !== 'ok') {
          newAlerts.push({
            id: `${timeFormatted}-ph-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'pH',
            value: newPh,
            unit: '',
            status: phStatus,
          });
        }
        if (tempStatus !== 'ok') {
          newAlerts.push({
            id: `${timeFormatted}-temp-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'Temperatura',
            value: newTemp,
            unit: '°C',
            status: tempStatus,
          });
        }
        if (turbidityStatus !== 'ok') {
          newAlerts.push({
            id: `${timeFormatted}-tur-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'Turbidez',
            value: newTurbidity,
            unit: 'NTU',
            status: turbidityStatus,
          });
        }

        // 4. Construir nuevo registro histórico
        const newRecord: HistoryRecord = {
          time: timeFormatted,
          ph: newPh,
          temperature: newTemp,
          turbidity: newTurbidity,
        };

        // 5. Agregar al historial y al log
        const updatedHistory: HistoryRecord[] = [
          ...historyData.slice(-(MAX_HISTORY_LENGTH - 1)),
          newRecord,
        ];
        const updatedAlertLog: AlertEvent[] = [
          ...newAlerts,
          ...alertLog,
        ].slice(0, 50);

        // 6. Actualizar store
        set({
          ph: newPh,
          temperature: newTemp,
          turbidity: newTurbidity,
          lastUpdated: timeNow,
          isConnected: true,
          isScanning: false,
          historyData: updatedHistory,
          alertLog: updatedAlertLog,
          totalAlerts: totalAlerts + newAlerts.length,
        });
      }, 2000);

      set({ intervalId: id });
    }, 150);

    set({ intervalId: handshakeTimer as unknown as ReturnType<typeof setInterval> });
  },

  // ──────────────────────────────────────────
  // disconnect()
  // ──────────────────────────────────────────
  disconnect: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
      clearTimeout(intervalId);
    }

    set({
      isConnected: false,
      isScanning: false,
      intervalId: null,
      lastUpdated: null,
      sessionStart: null,
      sessionStartTime: null,
      ph: 7.2,
      temperature: 23.4,
      turbidity: 1.2,
    });
  },

  // ──────────────────────────────────────────
  // updateAlertRanges(newRanges)
  // ──────────────────────────────────────────
  updateAlertRanges: (newRanges: Partial<AlertRanges>) => {
    const current = get();
    set({
      alertRanges: {
        ph: { ...current.alertRanges.ph, ...newRanges.ph },
        temperature: { ...current.alertRanges.temperature, ...newRanges.temperature },
        turbidity: { ...current.alertRanges.turbidity, ...newRanges.turbidity },
      },
    });
  },

  // ──────────────────────────────────────────
  // clearAlertLog()
  // ──────────────────────────────────────────
  clearAlertLog: () => set({ alertLog: [], totalAlerts: 0 }),
}));
