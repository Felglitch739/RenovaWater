import { create } from 'zustand';
import { bleService, type BleConnectionStatus, type BleDiscoveredDevice } from '../services/bleService';
import { parseEsp32Telemetry, classifyPh, type PhClassification, type TelemetryReading } from '../services/telemetryParser';

// ─────────────────────────────────────────────
// Tipos públicos exportados
// ─────────────────────────────────────────────

/** Estado cualitativo de cada métrica */
export type MetricStatus = 'ok' | 'warning' | 'danger';
export type AppTheme = 'dark' | 'light';
export type ConnectionMode = 'bluetooth' | 'simulation';

/** Un registro histórico de una muestra del sensor */
export interface HistoryRecord {
  time: string;       // Timestamp formateado HH:MM:SS
  ph: number;
  temperature: number;
  turbidity: number;
  adc?: number;
  voltage?: number;
}

/** Un evento de alerta individual registrado en el log */
export interface AlertEvent {
  id: string;           // UUID simple (time + Math.random)
  time: string;         // HH:MM:SS del momento de la alerta
  parameter: 'pH' | 'Temperatura' | 'Conductividad' | 'Turbidez';
  value: number;
  unit: string;
  status: MetricStatus; // 'warning' | 'danger'
  message?: string;
}

/** Rango configurable para una sola métrica */
export interface MetricRange {
  min?: number;       // Límite inferior (opcional para turbidez que solo tiene max)
  max: number;        // Límite superior
}

/** Objeto completo de rangos de alerta configurables por el usuario */
export interface AlertRanges {
  ph: Required<MetricRange>;          // pH siempre tiene min y max (óptimo 6.5 a 7.5)
  temperature: Required<MetricRange>; // Temperatura (°C)
  turbidity: Pick<MetricRange, 'max'>; // Turbidez (NTU)
  conductivity: Required<MetricRange>; // Conductividad (µS/cm)
}

/** Configuración de visibilidad de medidores en el dashboard */
export interface VisibleMeters {
  wqi: boolean;           // Índice Global WQI
  ph: boolean;            // Medidor de pH (Hardware Activo pH-4502C)
  temperature: boolean;   // Medidor de Temperatura (Standby)
  conductivity: boolean;  // Gráfico de Conductividad Eléctrica (Standby)
  turbidity: boolean;     // Medidor de Turbidez (Standby)
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
  // --- Lecturas actuales del sensor de pH (Hardware Activo: pH-4502C) ---
  ph: number;
  phClassification: PhClassification;
  
  // --- Datos técnicos y de depuración del ESP32 ---
  adc: number | null;        // Lectura cruda ADC 12-bit (0 - 4095)
  voltage: number | null;    // Voltaje analógico (0 - 3.3V)
  rawTelemetry: string | null; // Cadena cruda entrante

  // --- Sensores pendientes de hardware (Standby) ---
  temperature: number;
  turbidity: number;
  isHardwareOnlyPh: boolean; // Indica que solo el sensor de pH está transmitiendo en hardware

  // --- Metadatos de conexión ---
  connectionMode: ConnectionMode;
  lastUpdated: Date | null;
  isConnected: boolean;
  isScanning: boolean;
  intervalId: ReturnType<typeof setInterval> | null;

  // --- Estado Bluetooth BLE ---
  bleStatus: BleConnectionStatus;
  bleDevices: BleDiscoveredDevice[];
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  bleError: string | null;

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

  // --- Timestamp de inicio de sesión ---
  sessionStart: Date | null;
  sessionStartTime: number | null;

  // --- Configuración de App ---
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  setConnectionMode: (mode: ConnectionMode) => void;

  // --- Acciones de Telemetría y BLE ---
  processTelemetryString: (telemetryString: string) => void;
  startBleScan: () => Promise<void>;
  stopBleScan: () => void;
  connectBleDevice: (deviceId: string) => Promise<boolean>;
  disconnectBleDevice: () => Promise<void>;

  // --- Acciones Generales ---
  connect: () => void;
  disconnect: () => void;
  updateAlertRanges: (newRanges: Partial<AlertRanges>) => void;
  clearAlertLog: () => void;
}

// ─────────────────────────────────────────────
// Rangos del proyecto por defecto
// ─────────────────────────────────────────────

const DEFAULT_ALERT_RANGES: AlertRanges = {
  ph:          { min: 6.5,  max: 7.5  }, // Regla: 6.5 - 7.5 Neutro, < 6.5 Ácido, > 7.5 Alcalino
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
 * - ok      → dentro del rango [min, max] (6.5 - 7.5 Neutro)
 * - warning → tolerancia cercana (ej. 6.0 - 6.49 o 7.51 - 8.0)
 * - danger  → fuertemente ácido (< 6.0) o fuertemente alcalino (> 8.0)
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

export const evaluateTemperature = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.temperature,
): MetricStatus => {
  if (val < range.min - 10 || val > range.max + 10) return 'danger';
  if (val < range.min || val > range.max) return 'warning';
  return 'ok';
};

export const evaluateTurbidity = (
  val: number,
  range: Pick<MetricRange, 'max'> = DEFAULT_ALERT_RANGES.turbidity,
): MetricStatus => {
  if (val <= range.max) return 'ok';
  if (val <= range.max * 4) return 'warning';
  return 'danger';
};

export const evaluateConductivity = (
  val: number,
  range: Required<MetricRange> = DEFAULT_ALERT_RANGES.conductivity,
): MetricStatus => {
  if (val < range.min - 100 || val > range.max + 250) return 'danger';
  if (val < range.min || val > range.max) return 'warning';
  return 'ok';
};

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
  // ── Valores iniciales del sensor (pH-4502C) ──
  ph: 7.00,
  phClassification: 'NEUTRO',
  adc: 2048.00,
  voltage: 1.65,
  rawTelemetry: 'ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00',

    // ── Sensores en Standby (sin hardware conectado actualmente) ──
    temperature: 24.0,
    turbidity: 0.8,
    isHardwareOnlyPh: true,

    // ── Metadatos de conexión ──
    connectionMode: 'bluetooth',
    lastUpdated: null,
    isConnected: false,
    isScanning: false,
    intervalId: null,

    // ── Estado Bluetooth BLE ──
    bleStatus: 'disconnected',
    bleDevices: [],
    connectedDeviceId: null,
    connectedDeviceName: null,
    bleError: null,

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

    setConnectionMode: (mode: ConnectionMode) => {
      const current = get();
      if (current.isConnected) {
        current.disconnect();
      }
      set({ connectionMode: mode });
    },

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
    // processTelemetryString(rawString)
    // Procesa cadenas reales del ESP32:
    // "ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00"
    // ──────────────────────────────────────────
    processTelemetryString: (telemetryString: string) => {
      const reading = parseEsp32Telemetry(telemetryString);
      if (!reading) return;

      const now = new Date();
      const timeFormatted = formatTime(now);
      const { alertRanges, visibleMeters, historyData, alertLog, totalAlerts, sessionStartTime } = get();

      const newPh = reading.ph;
      const newClassification = reading.classification;
      const phStatus = evaluatePh(newPh, alertRanges.ph);

      // Alertas solo para pH porque es el único con hardware conectado
      const newAlerts: AlertEvent[] = [];
      if (phStatus !== 'ok' && visibleMeters.ph) {
        const msg = newClassification === 'ÁCIDO' 
          ? `pH Ácido detectado (${newPh.toFixed(2)} pH)` 
          : `pH Alcalino detectado (${newPh.toFixed(2)} pH)`;

        newAlerts.push({
          id: `${timeFormatted}-ph-${Math.random().toString(36).slice(2, 6)}`,
          time: timeFormatted,
          parameter: 'pH',
          value: newPh,
          unit: 'pH',
          status: phStatus,
          message: msg,
        });
      }

      // Registro histórico con el pH real
      const newRecord: HistoryRecord = {
        time: timeFormatted,
        ph: newPh,
        temperature: get().temperature,
        turbidity: get().turbidity,
        adc: reading.adc,
        voltage: reading.voltage,
      };

      const updatedHistory: HistoryRecord[] = [
        ...historyData.slice(-(MAX_HISTORY_LENGTH - 1)),
        newRecord,
      ];

      const updatedAlertLog: AlertEvent[] = [
        ...newAlerts,
        ...alertLog,
      ].slice(0, 50);

      set({
        ph: newPh,
        phClassification: newClassification,
        adc: reading.adc,
        voltage: reading.voltage,
        rawTelemetry: reading.raw,
        lastUpdated: now,
        isConnected: true,
        sessionStart: get().sessionStart || now,
        sessionStartTime: sessionStartTime || Date.now(),
        historyData: updatedHistory,
        alertLog: updatedAlertLog,
        totalAlerts: totalAlerts + newAlerts.length,
      });
    },

    // ──────────────────────────────────────────
    // Acciones Bluetooth BLE
    // ──────────────────────────────────────────
    startBleScan: async () => {
      set({ isScanning: true, bleError: null });
      await bleService.startScan(12000);
    },

    stopBleScan: () => {
      bleService.stopScan();
      set({ isScanning: false });
    },

    connectBleDevice: async (deviceId: string) => {
      set({ isScanning: false, bleError: null });
      const success = await bleService.connectToDevice(deviceId);
      if (success) {
        const dev = bleService.getConnectedDevice();
        set({
          connectedDeviceId: deviceId,
          connectedDeviceName: dev?.name || 'ESP32 pH Sonda',
          isConnected: true,
          connectionMode: 'bluetooth',
        });
      }
      return success;
    },

    disconnectBleDevice: async () => {
      await bleService.disconnect();
      set({
        connectedDeviceId: null,
        connectedDeviceName: null,
        isConnected: false,
      });
    },

    // ──────────────────────────────────────────
    // connect() — Inicia según modo activo
    // ──────────────────────────────────────────
    connect: () => {
      const { connectionMode, intervalId } = get();

      if (intervalId) {
        clearInterval(intervalId);
        clearTimeout(intervalId);
      }

      if (connectionMode === 'bluetooth') {
        // En modo BLE, iniciar escaneo de dispositivos
        get().startBleScan();
        return;
      }

      // --- MODO SIMULACIÓN (Para pruebas de UI de pH) ---
      set({ isScanning: true, isConnected: false });

      const handshakeTimer = setTimeout(() => {
        const startTime = Date.now();
        const now = new Date(startTime);
        const timeStr = formatTime(now);

        // Generar un pH de prueba inicial
        const initialPh = parseFloat((6.2 + Math.random() * 2.0).toFixed(2));
        const initialVolt = parseFloat((initialPh * 0.23 + 0.1).toFixed(2));
        const initialAdc = Math.round(initialVolt * 1240);
        const initialSimString = `ADC: ${initialAdc}.00 | Voltaje: ${initialVolt.toFixed(2)} V | pH: ${initialPh.toFixed(2)}`;

        get().processTelemetryString(initialSimString);

        set({
          lastUpdated: now,
          sessionStart: now,
          sessionStartTime: startTime,
          isConnected: true,
          isScanning: false,
        });

        // Intervalo de simulación cada 2.5 segundos
        const id = setInterval(() => {
          // pH fluctuando naturalmente para probar Ácido / Neutro / Alcalino
          const simPh = parseFloat((5.8 + Math.random() * 2.6).toFixed(2));
          const simVolt = parseFloat((simPh * 0.23 + 0.1).toFixed(2));
          const simAdc = Math.round(simVolt * 1240);
          const simString = `ADC: ${simAdc}.00 | Voltaje: ${simVolt.toFixed(2)} V | pH: ${simPh.toFixed(2)}`;

          get().processTelemetryString(simString);
        }, 2500);

        set({ intervalId: id });
      }, 200);

      set({ intervalId: handshakeTimer as unknown as ReturnType<typeof setInterval> });
    },

    // ──────────────────────────────────────────
    // disconnect()
    // ──────────────────────────────────────────
    disconnect: () => {
      const { intervalId, connectionMode } = get();
      if (intervalId) {
        clearInterval(intervalId);
        clearTimeout(intervalId);
      }

      if (connectionMode === 'bluetooth') {
        get().disconnectBleDevice();
      }

      set({
        isConnected: false,
        isScanning: false,
        intervalId: null,
        lastUpdated: null,
        sessionStart: null,
        sessionStartTime: null,
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

// ─────────────────────────────────────────────
// Conexión segura de listeners de bleService con el Store
// ─────────────────────────────────────────────
bleService.onStatusChange((status, error) => {
  const isNowConnected = status === 'connected';
  const isNowScanning = status === 'scanning';
  const currentState = useSensorStore.getState();

  useSensorStore.setState({
    bleStatus: status,
    isScanning: isNowScanning,
    isConnected: isNowConnected,
    bleError: error || null,
    lastUpdated: isNowConnected ? new Date() : currentState.lastUpdated,
    sessionStart: isNowConnected && !currentState.sessionStart ? new Date() : currentState.sessionStart,
    sessionStartTime: isNowConnected && !currentState.sessionStartTime ? Date.now() : currentState.sessionStartTime,
  });
});

bleService.onDevicesDiscovered((devices) => {
  useSensorStore.setState({ bleDevices: devices });
});

bleService.onTelemetry((reading, rawText) => {
  useSensorStore.getState().processTelemetryString(rawText);
});

