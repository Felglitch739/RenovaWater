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
  parameter: 'pH' | 'Temperatura' | 'Conductividad' | 'Turbidez';
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
  conductivity: Required<MetricRange>; // Conductividad (µS/cm) tiene min y max
}

/** Configuración de visibilidad de medidores en el dashboard */
export interface VisibleMeters {
  wqi: boolean;           // Índice Global WQI
  ph: boolean;            // Medidor de pH
  temperature: boolean;   // Medidor de Temperatura
  conductivity: boolean;  // Gráfico de Conductividad Eléctrica
  turbidity: boolean;     // Medidor de Turbidez
}

export const DEFAULT_VISIBLE_METERS: VisibleMeters = {
  wqi: true,
  ph: true,
  temperature: true,
  conductivity: true,
  turbidity: true,
};

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

  // --- Visibilidad de medidores en el dashboard ---
  visibleMeters: VisibleMeters;
  toggleMeter: (meter: keyof VisibleMeters) => void;
  setVisibleMeters: (meters: Partial<VisibleMeters>) => void;
  resetVisibleMeters: () => void;

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
  temperature: { min: 20.0, max: 35.0 },
  turbidity:   { max: 5.0 },
  conductivity: { min: 250, max: 750 },
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
 * Evalúa la temperatura contra los rangos configurados:
 * - ok (verde)      → Rango [min, max] (por defecto 20.0°C - 35.0°C)
 * - warning (ámbar) → Fuera de [min, max] pero dentro de tolerancia
 * - danger (rojo)   → < (min - 10) o > (max + 10)
 */
export const evaluateTemperature = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.temperature,
): MetricStatus => {
  if (val < range.min - 10 || val > range.max + 10) return 'danger';
  if (val < range.min || val > range.max) return 'warning';
  return 'ok';
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

/**
 * Evalúa la conductividad eléctrica (µS/cm).
 * - ok      → val entre [min, max]
 * - warning → fuera de [min, max]
 * - danger  → fuera de tolerancia extrema
 */
export const evaluateConductivity = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.conductivity,
): MetricStatus => {
  if (val < range.min - 100 || val > range.max + 250) return 'danger';
  if (val < range.min || val > range.max) return 'warning';
  return 'ok';
};

// ─────────────────────────────────────────────
// Generadores de datos mock realistas
// ─────────────────────────────────────────────

/** Genera un pH con rango amplio (5.8 – 9.6) */
const generatePh = (): number =>
  parseFloat((5.8 + Math.random() * 3.8).toFixed(2));

/** Genera temperatura en rango amplio (14.0°C – 40.0°C) para disparar alertas periódicas */
const generateTemperature = (): number =>
  parseFloat((14.0 + Math.random() * 26.0).toFixed(1));

/** Genera turbidez (0 – 42 NTU) */
const generateTurbidity = (): number =>
  parseFloat((Math.random() * 42).toFixed(1));

/** Genera conductividad en µS/cm (180 – 880 µS/cm) */
const generateConductivity = (): number =>
  Math.round(180 + Math.random() * 700);

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
  visibleMeters: DEFAULT_VISIBLE_METERS,
  historyData: [],
  alertLog: [],
  totalAlerts: 0,
  sessionStart: null,
  sessionStartTime: null,
  theme: 'dark',

  setTheme: (theme: AppTheme) => set({ theme }),

  toggleMeter: (meter: keyof VisibleMeters) =>
    set((state) => ({
      visibleMeters: {
        ...state.visibleMeters,
        [meter]: !state.visibleMeters[meter],
      },
    })),

  setVisibleMeters: (newMeters: Partial<VisibleMeters>) =>
    set((state) => ({
      visibleMeters: {
        ...state.visibleMeters,
        ...newMeters,
      },
    })),

  resetVisibleMeters: () => set({ visibleMeters: DEFAULT_VISIBLE_METERS }),

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
        const { alertRanges, visibleMeters, historyData, alertLog, totalAlerts } = get();
        const timeFormatted = formatTime(timeNow);

        // 1. Generar nuevos valores del sensor
        const newPh = generatePh();
        const newTemp = generateTemperature();
        const newTurbidity = generateTurbidity();
        const newConductivity = generateConductivity();

        // 2. Evaluar estado de cada parámetro
        const phStatus = evaluatePh(newPh, alertRanges.ph);
        const tempStatus = evaluateTemperature(newTemp, alertRanges.temperature);
        const turbidityStatus = evaluateTurbidity(newTurbidity, alertRanges.turbidity);
        const conductivityStatus = evaluateConductivity(newConductivity, alertRanges.conductivity);

        // 3. Construir eventos de alerta si están fuera de rango Y si el medidor está activo en Ajustes
        const newAlerts: AlertEvent[] = [];
        if (phStatus !== 'ok' && visibleMeters.ph) {
          newAlerts.push({
            id: `${timeFormatted}-ph-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'pH',
            value: newPh,
            unit: '',
            status: phStatus,
          });
        }
        if (tempStatus !== 'ok' && visibleMeters.temperature) {
          newAlerts.push({
            id: `${timeFormatted}-temp-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'Temperatura',
            value: newTemp,
            unit: '°C',
            status: tempStatus,
          });
        }
        if (turbidityStatus !== 'ok' && visibleMeters.turbidity) {
          newAlerts.push({
            id: `${timeFormatted}-tur-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'Turbidez',
            value: newTurbidity,
            unit: 'NTU',
            status: turbidityStatus,
          });
        }
        if (conductivityStatus !== 'ok' && visibleMeters.conductivity) {
          newAlerts.push({
            id: `${timeFormatted}-cond-${Math.random().toString(36).slice(2, 6)}`,
            time: timeFormatted,
            parameter: 'Conductividad',
            value: newConductivity,
            unit: 'µS/cm',
            status: conductivityStatus,
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
        conductivity: { ...current.alertRanges.conductivity, ...newRanges.conductivity },
      },
    });
  },

  // ──────────────────────────────────────────
  // clearAlertLog()
  // ──────────────────────────────────────────
  clearAlertLog: () => set({ alertLog: [], totalAlerts: 0 }),
}));
