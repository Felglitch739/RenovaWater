/**
 * services/bleService.ts
 * 
 * Gestor de comunicación Bluetooth Low Energy (BLE) para ESP32 en modo BEACON / BROADCAST.
 * 
 * Arquitectura:
 * - NO utiliza conexiones GATT (device.connect() ni características UART eliminadas).
 * - Realiza escaneo continuo de paquetes de advertising (startDeviceScan con allowDuplicates: true).
 * - Detecta el dispositivo 'TPH_Mon' (o similar) y extrae directamente 'manufacturerData' (Base64).
 * - Decodifica el payload (ej. "P:7.20,V:1.65"), parsea la telemetría y actualiza los listeners del Store.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { decode as base64Decode } from 'base-64';
import { parseEsp32Telemetry, type TelemetryReading } from './telemetryParser';

// Tipos de estado BLE
export type BleConnectionStatus = 
  | 'disconnected'
  | 'scanning'
  | 'connected'
  | 'error';

export interface BleDiscoveredDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable?: boolean;
  manufacturerData?: string | null;
  lastSeen?: Date;
}

// Nombre esperado del dispositivo Beacon configurado en el firmware del ESP32
export const TARGET_BEACON_NAME = 'TPH_Mon';

type StatusListener = (status: BleConnectionStatus, error?: string) => void;
type DeviceListener = (devices: BleDiscoveredDevice[]) => void;
type TelemetryListener = (reading: TelemetryReading, rawText: string) => void;

class Esp32BleService {
  private bleManager: any = null;
  private isNativeAvailable: boolean = false;
  private isScanning: boolean = false;

  private targetDevice: BleDiscoveredDevice | null = null;
  private discoveredDevicesMap: Map<string, BleDiscoveredDevice> = new Map();

  private statusListeners: Set<StatusListener> = new Set();
  private deviceListeners: Set<DeviceListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();

  private currentStatus: BleConnectionStatus = 'disconnected';
  private lastErrorMessage: string | null = null;

  private notifyThrottleTimer: any = null;
  private isNotifyPending: boolean = false;

  private beaconWatchdogTimer: any = null;
  private telemetryThrottleTimer: any = null;
  private pendingTelemetry: { reading: TelemetryReading; rawText: string } | null = null;

  constructor() {
    this.initBleManager();
  }

  /**
   * Inicialización segura del BleManager nativo
   */
  private initBleManager() {
    try {
      // Import dinámico seguro para evitar crashes si se corre en Expo Go o Web
      const BlePlx = require('react-native-ble-plx');
      if (BlePlx && BlePlx.BleManager) {
        this.bleManager = new BlePlx.BleManager();
        this.isNativeAvailable = true;
      }
    } catch (err) {
      console.warn('[BLE Beacon] Módulo nativo react-native-ble-plx no disponible en este entorno:', err);
      this.isNativeAvailable = false;
    }
  }

  public isAvailable(): boolean {
    return this.isNativeAvailable && this.bleManager !== null;
  }

  public getStatus(): BleConnectionStatus {
    return this.currentStatus;
  }

  public getConnectedDevice(): BleDiscoveredDevice | null {
    return this.targetDevice;
  }

  // ── Suscripciones de eventos ──

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onDevicesDiscovered(listener: DeviceListener): () => void {
    this.deviceListeners.add(listener);
    return () => this.deviceListeners.delete(listener);
  }

  public onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  private setStatus(status: BleConnectionStatus, error?: string) {
    if (this.currentStatus === status && this.lastErrorMessage === (error || null)) {
      return;
    }
    this.currentStatus = status;
    this.lastErrorMessage = error || null;
    this.statusListeners.forEach((l) => l(status, error));
  }

  private notifyDevices() {
    const list = Array.from(this.discoveredDevicesMap.values()).sort((a, b) => {
      const isTargetA = (a.name || '').toLowerCase().includes('tph') ? 1 : 0;
      const isTargetB = (b.name || '').toLowerCase().includes('tph') ? 1 : 0;
      if (isTargetA !== isTargetB) return isTargetB - isTargetA;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
    this.deviceListeners.forEach((l) => l(list));
  }

  /**
   * Notifica la lista de dispositivos con throttle para evitar saturar React
   */
  private scheduleNotifyDevices(immediate: boolean = false) {
    if (immediate) {
      if (this.notifyThrottleTimer) {
        clearTimeout(this.notifyThrottleTimer);
        this.notifyThrottleTimer = null;
      }
      this.isNotifyPending = false;
      this.notifyDevices();
      return;
    }

    if (this.notifyThrottleTimer) {
      this.isNotifyPending = true;
      return;
    }

    this.notifyDevices();
    this.notifyThrottleTimer = setTimeout(() => {
      this.notifyThrottleTimer = null;
      if (this.isNotifyPending) {
        this.isNotifyPending = false;
        this.notifyDevices();
      }
    }, 600);
  }

  // ── Permisos en Android ──

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const scanGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        const connectGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        return scanGranted && connectGranted;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación para Bluetooth BLE',
            message: 'TPH Monitor requiere acceso para escanear Beacons de telemetría del ESP32.',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.error('[BLE Beacon] Error solicitando permisos Android:', err);
      return false;
    }
  }

  // ── Escaneo continuo de Beacons (Broadcast) ──

  public async startScan(): Promise<void> {
    if (!this.isAvailable()) {
      const msg = 'El módulo Bluetooth nativo no está disponible. Requieres un Development Build (APK) para acceder al hardware Bluetooth.';
      console.warn('[BLE Beacon]', msg);
      this.setStatus('error', msg);
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.setStatus('error', 'Permisos de Bluetooth o Ubicación denegados.');
      return;
    }

    // Verificar estado del adaptador Bluetooth
    try {
      const state = await this.bleManager.state();
      if (state !== 'PoweredOn') {
        const isReady = await new Promise<boolean>((resolve) => {
          const sub = this.bleManager.onStateChange((newState: string) => {
            if (newState === 'PoweredOn') {
              sub.remove();
              resolve(true);
            }
          }, true);
          setTimeout(() => {
            sub.remove();
            resolve(false);
          }, 3000);
        });

        if (!isReady) {
          this.setStatus('error', 'Bluetooth apagado. Por favor enciende el Bluetooth de tu teléfono.');
          return;
        }
      }
    } catch (e: any) {
      console.warn('[BLE Beacon] Error consultando estado Bluetooth:', e);
    }

    // Si ya estaba escaneando, no reiniciar innecesariamente
    if (this.isScanning) {
      console.log('[BLE Beacon] Escaneo continuo ya se encuentra activo.');
      return;
    }

    this.discoveredDevicesMap.clear();
    this.scheduleNotifyDevices(true);
    this.setStatus('scanning');
    this.isScanning = true;

    console.log('[BLE Beacon] Iniciando escaneo continuo de Beacons ESP32 (allowDuplicates: true)...');

    try {
      /**
       * IMPORTANTE: allowDuplicates: true permite recibir de manera continua
       * los paquetes de advertising que contienen la telemetría actualizada en cada ráfaga.
       */
      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error: any, device: any) => {
          if (error) {
            console.warn('[BLE Beacon] Error en startDeviceScan:', error);
            this.stopScan();
            this.setStatus('error', error.message || 'Error durante el escaneo BLE');
            return;
          }

          if (device && device.id) {
            this.handleDiscoveredBeacon(device);
          }
        }
      );
    } catch (err: any) {
      console.error('[BLE Beacon] Excepción al iniciar escaneo:', err);
      this.isScanning = false;
      this.setStatus('error', err.message || 'Fallo al iniciar el escaneo BLE');
    }
  }

  /**
   * Procesa cada paquete de advertising recibido durante el escaneo continuo
   */
  private handleDiscoveredBeacon(device: any) {
    const devName = device.name || device.localName || '';
    const rawMfgData = device.manufacturerData;

    // Actualizar registro en lista de dispositivos descubiertos
    const existing = this.discoveredDevicesMap.get(device.id);
    const resolvedName = devName || (existing ? existing.name : undefined) || 'Dispositivo BLE';

    this.discoveredDevicesMap.set(device.id, {
      id: device.id,
      name: resolvedName,
      rssi: device.rssi ?? existing?.rssi ?? null,
      isConnectable: device.isConnectable ?? false,
      manufacturerData: rawMfgData || existing?.manufacturerData || null,
      lastSeen: new Date(),
    });
    this.scheduleNotifyDevices(false);

    // 1. Verificar si es el dispositivo objetivo 'TPH_Mon' o si trae telemetría en manufacturerData
    const isTargetName = 
      devName.toLowerCase().includes(TARGET_BEACON_NAME.toLowerCase()) ||
      resolvedName.toLowerCase().includes(TARGET_BEACON_NAME.toLowerCase()) ||
      resolvedName.toLowerCase().includes('tph');

    if (!rawMfgData) {
      return;
    }

    // 2. Decodificar Base64 de manufacturerData
    const decodedText = this.decodeManufacturerData(rawMfgData);
    if (!decodedText) return;

    // 3. Parsear telemetría (formato "P:7.20,V:1.65")
    const reading = parseEsp32Telemetry(decodedText);

    if (reading && reading.isValid) {
      // Registrar dispositivo objetivo conectado virtualmente vía Beacon
      this.targetDevice = {
        id: device.id,
        name: devName || TARGET_BEACON_NAME,
        rssi: device.rssi ?? null,
        manufacturerData: rawMfgData,
        lastSeen: new Date(),
      };

      // Si estábamos solo en 'scanning', elevar estado a 'connected' (recepción activa)
      if (this.currentStatus !== 'connected') {
        console.log(`[BLE Beacon] ¡Beacon '${this.targetDevice.name}' detectado y sincronizado!`);
        this.setStatus('connected');
      }

      // Reiniciar watchdog de recepción de Beacons
      this.resetWatchdogTimer();

      // Emitir lectura de telemetría a los suscriptores (Zustand)
      this.dispatchTelemetry(reading, decodedText);
    } else if (isTargetName) {
      console.log(`[BLE Beacon] Paquete recibido de ${resolvedName} pero sin formato de telemetría válido:`, decodedText);
    }
  }

  /**
   * Decodifica la cadena Base64 proveniente de manufacturerData.
   * Maneja tanto texto directo como paquetes que contengan prefijos binarios de Company Identifier.
   */
  public decodeManufacturerData(b64: string): string | null {
    if (!b64 || typeof b64 !== 'string') return null;

    try {
      const decodedRaw = base64Decode(b64);
      if (!decodedRaw || decodedRaw.length === 0) return null;

      // Buscar patrones de texto reconocibles como P:7.20,V:1.65 o ADC:... o JSON
      const pIndex = decodedRaw.search(/P(?:H)?\s*[:=]/i);
      const adcIndex = decodedRaw.search(/ADC\s*[:=]/i);
      const jsonIndex = decodedRaw.indexOf('{');

      let startIndex = 0;
      if (pIndex !== -1) {
        startIndex = pIndex;
      } else if (adcIndex !== -1) {
        startIndex = adcIndex;
      } else if (jsonIndex !== -1) {
        startIndex = jsonIndex;
      }

      const cleanText = decodedRaw.substring(startIndex).trim();
      return cleanText.length > 0 ? cleanText : decodedRaw.trim();
    } catch (err) {
      console.warn('[BLE Beacon] Error decodificando Base64 de manufacturerData:', err);
      return null;
    }
  }

  /**
   * Despacha la telemetría a los suscriptores con un leve throttle (~150ms)
   * para proteger la tasa de refresco a 60 FPS sin perder reactividad en tiempo real.
   */
  private dispatchTelemetry(reading: TelemetryReading, rawText: string) {
    this.pendingTelemetry = { reading, rawText };

    if (this.telemetryThrottleTimer) return;

    // Disparar lectura inmediata
    if (this.pendingTelemetry) {
      const { reading: r, rawText: t } = this.pendingTelemetry;
      this.telemetryListeners.forEach((listener) => listener(r, t));
      this.pendingTelemetry = null;
    }

    this.telemetryThrottleTimer = setTimeout(() => {
      this.telemetryThrottleTimer = null;
      if (this.pendingTelemetry) {
        const { reading: r, rawText: t } = this.pendingTelemetry;
        this.pendingTelemetry = null;
        this.telemetryListeners.forEach((listener) => listener(r, t));
      }
    }, 150);
  }

  /**
   * Watchdog: Si no se recibe ningún paquete de Beacon durante 7 segundos,
   * el estado pasa de 'connected' a 'scanning' (buscando señal).
   */
  private resetWatchdogTimer() {
    if (this.beaconWatchdogTimer) {
      clearTimeout(this.beaconWatchdogTimer);
    }

    this.beaconWatchdogTimer = setTimeout(() => {
      if (this.isScanning && this.currentStatus === 'connected') {
        console.log('[BLE Beacon] Sin paquetes recientes del Beacon (Watchdog timeout). Buscando señal...');
        this.setStatus('scanning');
      }
    }, 7000);
  }

  public stopScan(): void {
    if (this.beaconWatchdogTimer) {
      clearTimeout(this.beaconWatchdogTimer);
      this.beaconWatchdogTimer = null;
    }
    if (this.notifyThrottleTimer) {
      clearTimeout(this.notifyThrottleTimer);
      this.notifyThrottleTimer = null;
      this.isNotifyPending = false;
    }
    if (this.telemetryThrottleTimer) {
      clearTimeout(this.telemetryThrottleTimer);
      this.telemetryThrottleTimer = null;
      this.pendingTelemetry = null;
    }

    if (this.isAvailable() && this.bleManager) {
      try {
        this.bleManager.stopDeviceScan();
      } catch (e) {
        // Ignorar si no estaba activo
      }
    }

    this.isScanning = false;
    this.setStatus('disconnected');
    console.log('[BLE Beacon] Escaneo continuo detenido.');
  }

  // ── Métodos de compatibilidad con UI y Store ──

  /**
   * En modo Beacon no existe conexión GATT. Inicia el escaneo continuo
   * y sincroniza con el Beacon seleccionado.
   */
  public async connectToDevice(deviceId?: string): Promise<boolean> {
    console.log('[BLE Beacon] Modo Broadcast activo: Iniciando escaneo continuo en lugar de conexión GATT...');
    await this.startScan();
    return true;
  }

  public async disconnect(): Promise<void> {
    this.stopScan();
    this.targetDevice = null;
  }
}

// Exportar instancia singleton
export const bleService = new Esp32BleService();
