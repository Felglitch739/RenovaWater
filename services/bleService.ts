/**
 * services/bleService.ts
 * 
 * Gestor de comunicación Bluetooth Low Energy (BLE) para ESP32.
 * Maneja escaneo, conexión, permisos en Android/iOS, suscripción de notificaciones UART y decodificación de datos.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { decode as base64Decode } from 'base-64';
import { parseEsp32Telemetry, type TelemetryReading } from './telemetryParser';

// Tipos de estado BLE
export type BleConnectionStatus = 
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export interface BleDiscoveredDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable?: boolean;
}

// UUIDs configurados en el firmware del ESP32
export const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'.toLowerCase();
export const ESP32_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'.toLowerCase();

// UUIDs estándar de respaldo (Nordic UART)
export const NORDIC_UART_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase();
export const NORDIC_UART_TX_CHAR_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase();
export const NORDIC_UART_RX_CHAR_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase();

type StatusListener = (status: BleConnectionStatus, error?: string) => void;
type DeviceListener = (devices: BleDiscoveredDevice[]) => void;
type TelemetryListener = (reading: TelemetryReading, rawText: string) => void;

class Esp32BleService {
  private bleManager: any = null;
  private isNativeAvailable: boolean = false;
  private connectedDevice: any = null;
  private characteristicSubscription: any = null;
  private buffer: string = '';
  
  private discoveredDevicesMap: Map<string, BleDiscoveredDevice> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private deviceListeners: Set<DeviceListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();

  private currentStatus: BleConnectionStatus = 'disconnected';
  private lastErrorMessage: string | null = null;
  private scanTimeoutId: any = null;

  constructor() {
    this.initBleManager();
  }

  /**
   * Inicialización segura del BleManager
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
      console.warn('[BLE] Módulo nativo react-native-ble-plx no disponible en este entorno:', err);
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
    if (!this.connectedDevice) return null;
    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name || 'ESP32 pH Sonda',
      rssi: this.connectedDevice.rssi ?? null,
    };
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
    this.currentStatus = status;
    this.lastErrorMessage = error || null;
    this.statusListeners.forEach((l) => l(status, error));
  }

  private notifyDevices() {
    const list = Array.from(this.discoveredDevicesMap.values()).sort((a, b) => {
      const isEspA = (a.name || '').toLowerCase().includes('esp') || (a.name || '').toLowerCase().includes('ph') ? 1 : 0;
      const isEspB = (b.name || '').toLowerCase().includes('esp') || (b.name || '').toLowerCase().includes('ph') ? 1 : 0;
      if (isEspA !== isEspB) return isEspB - isEspA;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
    this.deviceListeners.forEach((l) => l(list));
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
            title: 'Permiso de Ubicación para Bluetooth',
            message: 'TPH Monitor requiere acceso para descubrir dispositivos ESP32 cercanos.',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.error('[BLE] Error solicitando permisos Android:', err);
      return false;
    }
  }

  // ── Escaneo de dispositivos ──

  public async startScan(timeoutMs: number = 15000): Promise<void> {
    if (!this.isAvailable()) {
      const msg = 'El módulo Bluetooth nativo no está disponible. Si usas Expo Go, requieres un Development Build (APK) para acceder al hardware Bluetooth.';
      console.warn('[BLE]', msg);
      this.setStatus('error', msg);
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.setStatus('error', 'Permisos de Bluetooth o Ubicación denegados en el dispositivo.');
      return;
    }

    // Verificar estado del adaptador Bluetooth
    try {
      const state = await this.bleManager.state();
      console.log('[BLE] Estado actual del adaptador Bluetooth:', state);
      if (state !== 'PoweredOn') {
        // Esperar a que pase a PoweredOn si está encendiéndose
        const isReady = await new Promise<boolean>((resolve) => {
          const sub = this.bleManager.onStateChange((newState: string) => {
            console.log('[BLE] Cambio de estado de adaptador:', newState);
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
          this.setStatus('error', 'Bluetooth apagado o no disponible. Por favor enciende el Bluetooth y la Ubicación (GPS) de tu teléfono.');
          return;
        }
      }
    } catch (e: any) {
      console.warn('[BLE] Error consultando estado de Bluetooth:', e);
    }

    // Limpiar lista anterior
    this.discoveredDevicesMap.clear();
    this.notifyDevices();
    this.setStatus('scanning');

    if (this.scanTimeoutId) clearTimeout(this.scanTimeoutId);

    console.log('[BLE] Iniciando escaneo de periféricos BLE...');

    try {
      this.bleManager.startDeviceScan(
        null, // Escanear todos los servicios
        { allowDuplicates: true },
        (error: any, device: any) => {
          if (error) {
            console.warn('[BLE] Error en startDeviceScan:', error);
            this.stopScan();
            this.setStatus('error', error.message || 'Error durante el escaneo BLE');
            return;
          }

          if (device && device.id) {
            const existing = this.discoveredDevicesMap.get(device.id);
            const devName = device.name || device.localName || (existing ? existing.name : undefined);
            
            this.discoveredDevicesMap.set(device.id, {
              id: device.id,
              name: devName || 'Dispositivo Desconocido',
              rssi: device.rssi ?? existing?.rssi ?? null,
              isConnectable: device.isConnectable ?? true,
            });
            this.notifyDevices();
          }
        }
      );

      this.scanTimeoutId = setTimeout(() => {
        console.log('[BLE] Tiempo de escaneo finalizado.');
        this.stopScan();
      }, timeoutMs);
    } catch (err: any) {
      console.error('[BLE] Excepción en startScan:', err);
      this.setStatus('error', err.message || 'Fallo al iniciar el escaneo BLE');
    }
  }

  public stopScan(): void {
    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
    if (this.isAvailable() && this.bleManager) {
      try {
        this.bleManager.stopDeviceScan();
      } catch (e) {
        // Ignorar
      }
    }
    if (this.currentStatus === 'scanning') {
      this.setStatus(this.connectedDevice ? 'connected' : 'disconnected');
    }
  }

  // ── Conexión y Suscripción ──

  public async connectToDevice(deviceId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.setStatus('error', 'Módulo Bluetooth nativo no disponible.');
      return false;
    }

    this.stopScan();
    this.setStatus('connecting');

    try {
      // 1. Conectar con el dispositivo
      const device = await this.bleManager.connectToDevice(deviceId, {
        autoConnect: false,
        timeout: 12000,
      });

      this.connectedDevice = device;

      // 2. Monitorear desconexión inesperada
      device.onDisconnected((error: any, disconnectedDev: any) => {
        console.log('[BLE] Dispositivo desconectado:', disconnectedDev?.id, error);
        this.cleanConnection();
        this.setStatus('disconnected', error ? 'Conexión interrumpida' : undefined);
      });

      // 3. Negociar MTU en Android (512 bytes para paquetes completos)
      if (Platform.OS === 'android') {
        try {
          await device.requestMTU(512);
        } catch {
          // Si falla MTU, continuar con MTU por defecto
        }
      }

      // 4. Descubrir servicios y características
      await device.discoverAllServicesAndCharacteristics();
      const services = await device.services();

      let subscribed = false;

      // 5. Buscar característica con NOTIFY o INDICATE
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          if (char.isNotifiable || char.isIndicatable) {
            this.subscribeToCharacteristic(char);
            subscribed = true;
            break;
          }
        }
        if (subscribed) break;
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      console.error('[BLE] Error conectando al dispositivo:', err);
      this.cleanConnection();
      this.setStatus('error', err.message || 'No se pudo conectar al ESP32');
      return false;
    }
  }

  private subscribeToCharacteristic(char: any) {
    if (this.characteristicSubscription) {
      this.characteristicSubscription.remove();
    }

    this.characteristicSubscription = char.monitor((error: any, characteristic: any) => {
      if (error) {
        console.warn('[BLE] Error en monitor de característica:', error);
        return;
      }

      if (characteristic && characteristic.value) {
        this.handleIncomingBase64(characteristic.value);
      }
    });
  }

  /**
   * Procesa los datos base64 recibidos por BLE
   */
  private handleIncomingBase64(base64Str: string) {
    try {
      const decodedText = base64Decode(base64Str);
      this.buffer += decodedText;

      // Procesar líneas delimitadas por \n o \r
      if (this.buffer.includes('\n') || this.buffer.includes('\r')) {
        const lines = this.buffer.split(/[\r\n]+/);
        // Guardar el último fragmento incompleto si no termina en salto de línea
        const lastIncomplete = this.buffer.endsWith('\n') || this.buffer.endsWith('\r') ? '' : lines.pop() || '';
        this.buffer = lastIncomplete;

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.length > 0) {
            this.processIncomingLine(cleanLine);
          }
        }
      } else if (this.buffer.includes('ADC:') && this.buffer.includes('pH:')) {
        // En caso de que no haya saltos de línea pero tengamos la cadena completa
        const trimmed = this.buffer.trim();
        this.processIncomingLine(trimmed);
        this.buffer = '';
      }
    } catch (err) {
      console.warn('[BLE] Error decodificando paquete base64:', err);
    }
  }

  /**
   * Parsea la línea de texto y notifica a los suscriptores
   */
  public processIncomingLine(lineText: string) {
    const reading = parseEsp32Telemetry(lineText);
    if (reading) {
      this.telemetryListeners.forEach((listener) => listener(reading, lineText));
    }
  }

  // ── Desconexión ──

  public async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        // Ignorar
      }
    }
    this.cleanConnection();
    this.setStatus('disconnected');
  }

  private cleanConnection() {
    if (this.characteristicSubscription) {
      try {
        this.characteristicSubscription.remove();
      } catch (e) {}
      this.characteristicSubscription = null;
    }
    this.connectedDevice = null;
    this.buffer = '';
  }
}

// Exportar instancia singleton
export const bleService = new Esp32BleService();
