import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSensorStore, type VisibleMeters } from '../store/useSensorStore';
import { AuraCard } from './AuraCard';
import { ConfigModal } from './ConfigModal';
import {
  SettingsIcon,
  DropletIcon,
  ThermometerIcon,
  ZapIcon,
  WavesIcon,
  ActivityIcon,
  BluetoothIcon,
  SunIcon,
  MoonIcon,
  AlertTriangleIcon,
  PlayIcon,
} from './Icons';

// ─────────────────────────────────────────────────────────────
// Configuración de los 5 medidores configurables
// ─────────────────────────────────────────────────────────────

interface MeterConfigItem {
  id: keyof VisibleMeters;
  title: string;
  subtitle: string;
  color: string;
  iconBg: string;
  iconBorder: string;
  renderIcon: (color: string) => React.ReactNode;
}

const METER_CONFIGS: MeterConfigItem[] = [
  {
    id: 'wqi',
    title: 'Índice Global WQI',
    subtitle: 'Diagnóstico consolidado de calidad del agua',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.25)',
    renderIcon: (c) => <ActivityIcon size={16} color={c} />,
  },
  {
    id: 'ph',
    title: 'Sensor de pH (pH-4502C)',
    subtitle: 'Medición electroquímica en tiempo real (0 - 14)',
    color: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.12)',
    iconBorder: 'rgba(14, 165, 233, 0.25)',
    renderIcon: (c) => <DropletIcon size={16} color={c} />,
  },
  {
    id: 'temperature',
    title: 'Temperatura',
    subtitle: 'Monitoreo térmico en grados Celsius (°C)',
    color: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconBorder: 'rgba(239, 68, 68, 0.25)',
    renderIcon: (c) => <ThermometerIcon size={16} color={c} />,
  },
  {
    id: 'conductivity',
    title: 'Conductividad Eléctrica',
    subtitle: 'Concentración de sales y minerales (µS/cm)',
    color: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconBorder: 'rgba(245, 158, 11, 0.25)',
    renderIcon: (c) => <ZapIcon size={16} color={c} />,
  },
  {
    id: 'turbidity',
    title: 'Turbidez Óptica',
    subtitle: 'Claridad y sólidos suspendidos (NTU)',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.25)',
    renderIcon: (c) => <WavesIcon size={16} color={c} />,
  },
];

// ─────────────────────────────────────────────────────────────
// Vista principal: SettingsView (Ajustes de la Aplicación)
// ─────────────────────────────────────────────────────────────

import { useShallow } from 'zustand/react/shallow';

export const SettingsView: React.FC = () => {
  const {
    visibleMeters,
    toggleMeter,
    resetVisibleMeters,
    alertRanges,
    isConnected,
    isScanning,
    connectionMode,
    setConnectionMode,
    bleDevices,
    connectedDeviceName,
    connectedDeviceId,
    bleError,
    startBleScan,
    stopBleScan,
    connectBleDevice,
    connect,
    disconnect,
    ph,
    adc,
    voltage,
    rawTelemetry,
    theme,
    setTheme,
  } = useSensorStore(useShallow(state => ({
    visibleMeters: state.visibleMeters,
    toggleMeter: state.toggleMeter,
    resetVisibleMeters: state.resetVisibleMeters,
    alertRanges: state.alertRanges,
    isConnected: state.isConnected,
    isScanning: state.isScanning,
    connectionMode: state.connectionMode,
    setConnectionMode: state.setConnectionMode,
    bleDevices: state.bleDevices,
    connectedDeviceName: state.connectedDeviceName,
    connectedDeviceId: state.connectedDeviceId,
    bleError: state.bleError,
    startBleScan: state.startBleScan,
    stopBleScan: state.stopBleScan,
    connectBleDevice: state.connectBleDevice,
    connect: state.connect,
    disconnect: state.disconnect,
    ph: state.ph,
    adc: state.adc,
    voltage: state.voltage,
    rawTelemetry: state.rawTelemetry,
    theme: state.theme,
    setTheme: state.setTheme,
  })));

  const isDark = theme === 'dark';
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleConnectDevice = async (deviceId: string) => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setConnectingDeviceId(deviceId);
    try {
      await connectBleDevice(deviceId);
    } catch (err) {
      console.error('Error conectando dispositivo BLE:', err);
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Cabecera ── */}
      <View style={{ marginBottom: 18 }}>
        <Text style={[styles.mainHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          Ajustes
        </Text>
        <Text style={[styles.subHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          Conectividad, apariencia y parámetros del sistema
        </Text>
      </View>

      {/* ── SECCIÓN 1: CONEXIÓN BLUETOOTH / HARDWARE ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Conexión Hardware
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isConnected ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (isDark ? 'rgba(100,116,139,0.12)' : '#F1F5F9'),
                borderColor: isConnected ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0') : (isDark ? 'rgba(100,116,139,0.2)' : '#E2E8F0'),
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#94A3B8' }]} />
            <Text style={[styles.statusBadgeText, { color: isConnected ? '#10B981' : '#64748B' }]}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={18}
        >
          <View style={styles.cardContent}>
            {/* Selector de Modo */}
            <View style={[styles.modeSelectorRow, { backgroundColor: isDark ? '#11161F' : '#F1F5F9' }]}>
              <TouchableOpacity
                onPress={() => setConnectionMode('bluetooth')}
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  connectionMode === 'bluetooth' && {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
              >
                <BluetoothIcon size={14} color={connectionMode === 'bluetooth' ? '#0EA5E9' : '#64748B'} />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: connectionMode === 'bluetooth' ? (isDark ? '#F1F5F9' : '#0F172A') : '#64748B' },
                  ]}
                >
                  Bluetooth ESP32
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConnectionMode('simulation')}
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  connectionMode === 'simulation' && {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOpacity: isDark ? 0.2 : 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
              >
                <ActivityIcon size={14} color={connectionMode === 'simulation' ? '#10B981' : '#64748B'} />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: connectionMode === 'simulation' ? (isDark ? '#F1F5F9' : '#0F172A') : '#64748B' },
                  ]}
                >
                  Modo Simulación
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error de Bluetooth si existe */}
            {bleError && (
              <View style={styles.errorBanner}>
                <AlertTriangleIcon size={14} color="#EF4444" />
                <Text style={styles.errorBannerText}>{bleError}</Text>
              </View>
            )}

            {/* Dispositivo conectado */}
            {isConnected ? (
              <View>
                <View
                  style={[
                    styles.activeDeviceCard,
                    {
                      backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#F0FDF4',
                      borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#BBF7D0',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                    <View style={[styles.deviceIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#DCFCE7' }]}>
                      <BluetoothIcon size={16} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceNameText, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
                        {connectedDeviceName || 'ESP32 pH Sonda'}
                      </Text>
                      <Text style={[styles.deviceMetaText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                        {connectedDeviceId ? connectedDeviceId : 'Transmisión UART activa'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={disconnect}
                    activeOpacity={0.7}
                    style={styles.disconnectButton}
                  >
                    <Text style={styles.disconnectButtonText}>Desconectar</Text>
                  </TouchableOpacity>
                </View>

                {/* Resumen de telemetría en vivo */}
                <View style={[styles.liveDataBar, { backgroundColor: isDark ? '#11161F' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={styles.liveDataItem}>
                    <Text style={[styles.liveDataLabel, { color: isDark ? '#64748B' : '#94A3B8' }]}>pH ACTUAL</Text>
                    <Text style={[styles.liveDataValue, { color: '#0EA5E9' }]}>{ph.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.liveDataDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.liveDataItem}>
                    <Text style={[styles.liveDataLabel, { color: isDark ? '#64748B' : '#94A3B8' }]}>VOLTAJE</Text>
                    <Text style={[styles.liveDataValue, { color: '#F59E0B' }]}>{voltage !== null ? `${voltage.toFixed(2)} V` : '--'}</Text>
                  </View>
                  <View style={[styles.liveDataDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                  <View style={styles.liveDataItem}>
                    <Text style={[styles.liveDataLabel, { color: isDark ? '#64748B' : '#94A3B8' }]}>ADC</Text>
                    <Text style={[styles.liveDataValue, { color: isDark ? '#94A3B8' : '#64748B' }]}>{adc !== null ? Math.round(adc) : '--'}</Text>
                  </View>
                </View>
              </View>
            ) : connectionMode === 'bluetooth' ? (
              <View>
                {/* Botón de Escaneo */}
                <TouchableOpacity
                  onPress={isScanning ? stopBleScan : startBleScan}
                  activeOpacity={0.8}
                  style={[
                    styles.primaryActionBtn,
                    {
                      backgroundColor: isScanning
                        ? (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB')
                        : (isDark ? 'rgba(14,165,233,0.12)' : '#F0F9FF'),
                      borderColor: isScanning
                        ? (isDark ? 'rgba(245,158,11,0.35)' : '#FCD34D')
                        : (isDark ? 'rgba(14,165,233,0.35)' : '#BAE6FD'),
                    },
                  ]}
                >
                  {isScanning ? (
                    <>
                      <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
                      <Text style={[styles.primaryActionBtnText, { color: '#F59E0B' }]}>
                        Buscando dispositivos ESP32...
                      </Text>
                    </>
                  ) : (
                    <>
                      <BluetoothIcon size={16} color="#0EA5E9" />
                      <Text style={[styles.primaryActionBtnText, { color: '#0EA5E9' }]}>
                        Buscar Dispositivos BLE
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Lista de Dispositivos */}
                {bleDevices.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.devicesSectionTitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      Dispositivos cercanos ({bleDevices.length}):
                    </Text>

                    {bleDevices.map((dev) => {
                      const isEsp = (dev.name || '').toLowerCase().includes('esp') || (dev.name || '').toLowerCase().includes('ph');
                      const isThisConnecting = isConnecting && connectingDeviceId === dev.id;

                      return (
                        <TouchableOpacity
                          key={dev.id}
                          onPress={() => handleConnectDevice(dev.id)}
                          disabled={isConnecting || isConnected}
                          activeOpacity={0.7}
                          style={[
                            styles.deviceRow,
                            {
                              backgroundColor: isEsp
                                ? (isDark ? 'rgba(14,165,233,0.08)' : '#F0F9FF')
                                : (isDark ? '#11161F' : '#F8FAFC'),
                              borderColor: isEsp
                                ? (isDark ? 'rgba(14,165,233,0.35)' : '#BAE6FD')
                                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                              opacity: (isConnecting && !isThisConnecting) ? 0.5 : 1,
                            },
                          ]}
                        >
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.deviceItemTitle, { color: isEsp ? '#0EA5E9' : (isDark ? '#F1F5F9' : '#0F172A') }]}>
                              {dev.name || 'Dispositivo Desconocido'}
                            </Text>
                            <Text style={[styles.deviceItemSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                              {dev.id} {dev.rssi !== null ? `· ${dev.rssi} dBm` : ''}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.connectBtnSmall,
                              isEsp ? { backgroundColor: '#0EA5E9' } : { backgroundColor: isDark ? '#334155' : '#64748B' },
                              isThisConnecting && { backgroundColor: '#F59E0B', minWidth: 85 },
                            ]}
                          >
                            {isThisConnecting ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.connectBtnSmallText}>Conectar</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {bleDevices.length === 0 && !isScanning && (
                  <Text style={[styles.hintText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    Enciende el ESP32 y presiona "Buscar Dispositivos BLE" para sincronizar.
                  </Text>
                )}
              </View>
            ) : (
              /* Modo simulación */
              <TouchableOpacity
                onPress={connect}
                activeOpacity={0.8}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#F0FDF4',
                    borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#BBF7D0',
                  },
                ]}
              >
                <PlayIcon size={15} color="#10B981" />
                <Text style={[styles.primaryActionBtnText, { color: '#10B981' }]}>
                  Iniciar Simulación de Telemetría
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 2: APARIENCIA DEL SISTEMA ── */}
      <View style={{ marginBottom: 18 }}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 8 }]}>
          Apariencia
        </Text>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={18}
        >
          <View style={styles.cardContent}>
            <View style={[styles.modeSelectorRow, { backgroundColor: isDark ? '#11161F' : '#F1F5F9', marginBottom: 0 }]}>
              <TouchableOpacity
                onPress={() => setTheme('light')}
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  !isDark && {
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
              >
                <SunIcon size={15} color={!isDark ? '#F59E0B' : '#64748B'} />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: !isDark ? '#0F172A' : '#64748B' },
                  ]}
                >
                  Modo Claro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTheme('dark')}
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  isDark && {
                    backgroundColor: '#1E293B',
                    shadowColor: '#000',
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
              >
                <MoonIcon size={15} color={isDark ? '#38BDF8' : '#64748B'} />
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: isDark ? '#F1F5F9' : '#64748B' },
                  ]}
                >
                  Modo Oscuro
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 3: MEDIDORES EN PANTALLA ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Medidores en Pantalla
          </Text>
          <TouchableOpacity onPress={resetVisibleMeters} activeOpacity={0.7}>
            <Text style={[styles.headerActionText, { color: '#0EA5E9' }]}>
              Restablecer
            </Text>
          </TouchableOpacity>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={18}
        >
          <View style={styles.cardContent}>
            {METER_CONFIGS.map((meter, index) => {
              const isEnabled = visibleMeters[meter.id];
              const isLast = index === METER_CONFIGS.length - 1;

              return (
                <View
                  key={meter.id}
                  style={[
                    styles.meterRow,
                    !isLast && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.meterIconBox,
                      {
                        backgroundColor: meter.iconBg,
                        borderColor: meter.iconBorder,
                      },
                    ]}
                  >
                    {meter.renderIcon(meter.color)}
                  </View>

                  <View style={styles.meterTextColumn}>
                    <Text
                      style={[
                        styles.meterTitleText,
                        {
                          color: isEnabled
                            ? (isDark ? '#F1F5F9' : '#0F172A')
                            : (isDark ? '#64748B' : '#94A3B8'),
                        },
                      ]}
                    >
                      {meter.title}
                    </Text>
                    <Text style={[styles.meterSubtitleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {meter.subtitle}
                    </Text>
                  </View>

                  <Switch
                    value={isEnabled}
                    onValueChange={() => toggleMeter(meter.id)}
                    trackColor={{
                      false: isDark ? '#27272a' : '#E2E8F0',
                      true: 'rgba(14, 165, 233, 0.4)',
                    }}
                    thumbColor={isEnabled ? '#0EA5E9' : (isDark ? '#71717a' : '#94A3B8')}
                  />
                </View>
              );
            })}
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 4: UMBRALES DE CALIDAD Y ALERTAS ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Umbrales de Calidad
          </Text>
          <TouchableOpacity onPress={() => setIsConfigModalOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.headerActionText, { color: '#0EA5E9' }]}>
              Editar
            </Text>
          </TouchableOpacity>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={18}
        >
          <View style={styles.cardContent}>
            <View style={styles.thresholdsGrid}>
              {/* pH */}
              <View
                style={[
                  styles.thresholdCard,
                  {
                    backgroundColor: isDark ? 'rgba(14,165,233,0.06)' : '#F0F9FF',
                    borderColor: isDark ? 'rgba(14,165,233,0.2)' : '#BAE6FD',
                  },
                ]}
              >
                <View style={styles.thresholdIconRow}>
                  <DropletIcon size={13} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <Text style={[styles.thresholdLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    pH Óptimo
                  </Text>
                </View>
                <Text style={[styles.thresholdValue, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  {alertRanges.ph.min} – {alertRanges.ph.max} <Text style={styles.thresholdUnit}>pH</Text>
                </Text>
              </View>

              {/* Temperatura */}
              <View
                style={[
                  styles.thresholdCard,
                  {
                    backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FECACA',
                  },
                ]}
              >
                <View style={styles.thresholdIconRow}>
                  <ThermometerIcon size={13} color={isDark ? '#F87171' : '#DC2626'} />
                  <Text style={[styles.thresholdLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Temperatura
                  </Text>
                </View>
                <Text style={[styles.thresholdValue, { color: isDark ? '#F87171' : '#DC2626' }]}>
                  {alertRanges.temperature.min} – {alertRanges.temperature.max} <Text style={styles.thresholdUnit}>°C</Text>
                </Text>
              </View>

              {/* Conductividad */}
              <View
                style={[
                  styles.thresholdCard,
                  {
                    backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
                    borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A',
                  },
                ]}
              >
                <View style={styles.thresholdIconRow}>
                  <ZapIcon size={13} color={isDark ? '#FACC15' : '#D97706'} />
                  <Text style={[styles.thresholdLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Conductividad
                  </Text>
                </View>
                <Text style={[styles.thresholdValue, { color: isDark ? '#FACC15' : '#D97706' }]}>
                  {alertRanges.conductivity?.min ?? 250} – {alertRanges.conductivity?.max ?? 750} <Text style={styles.thresholdUnit}>µS</Text>
                </Text>
              </View>

              {/* Turbidez */}
              <View
                style={[
                  styles.thresholdCard,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0',
                  },
                ]}
              >
                <View style={styles.thresholdIconRow}>
                  <WavesIcon size={13} color={isDark ? '#34D399' : '#059669'} />
                  <Text style={[styles.thresholdLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Turbidez Máx
                  </Text>
                </View>
                <Text style={[styles.thresholdValue, { color: isDark ? '#34D399' : '#059669' }]}>
                  ≤ {alertRanges.turbidity.max} <Text style={styles.thresholdUnit}>NTU</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsConfigModalOpen(true)}
              activeOpacity={0.75}
              style={[
                styles.editThresholdsBtn,
                {
                  backgroundColor: isDark ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.06)',
                  borderColor: isDark ? 'rgba(14,165,233,0.25)' : 'rgba(14,165,233,0.2)',
                },
              ]}
            >
              <SettingsIcon size={14} color="#0EA5E9" />
              <Text style={styles.editThresholdsBtnText}>Modificar Umbrales y Rangos</Text>
            </TouchableOpacity>
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 5: INFORMACIÓN TÉCNICA (DISCRETA / COLAPSABLE) ── */}
      <View style={{ marginBottom: 18 }}>
        <TouchableOpacity
          onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
          activeOpacity={0.7}
          style={styles.techToggleRow}
        >
          <Text style={[styles.techToggleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            {showTechnicalDetails ? 'Ocultar diagnóstico técnico ▲' : 'Diagnóstico técnico y telemetría ▼'}
          </Text>
        </TouchableOpacity>

        {showTechnicalDetails && (
          <AuraCard
            colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
            radius={16}
            style={{ marginTop: 8 }}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.rawTelemetryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                ÚLTIMA TRAMA RAW (UART BLE):
              </Text>
              <View style={[styles.rawTelemetryBox, { backgroundColor: isDark ? '#0A0D14' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.rawTelemetryText, { color: '#0EA5E9' }]}>
                  {rawTelemetry || 'Sin trama recibida'}
                </Text>
              </View>
            </View>
          </AuraCard>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Text style={[styles.versionText, { color: isDark ? '#475569' : '#94A3B8' }]}>
          TPH Monitor · Sistema de Monitoreo de Agua
        </Text>
      </View>

      {/* Modal de Configuración */}
      <ConfigModal
        visible={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  mainHeading: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subHeading: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  modeSelectorRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 11,
    flex: 1,
  },
  activeDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  deviceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deviceNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deviceMetaText: {
    fontSize: 10,
    marginTop: 1,
  },
  disconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  disconnectButtonText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  liveDataBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  liveDataItem: {
    alignItems: 'center',
    flex: 1,
  },
  liveDataLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  liveDataValue: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  liveDataDivider: {
    width: 1,
    height: 18,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  devicesSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  deviceItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceItemSub: {
    fontSize: 10,
    marginTop: 1,
  },
  connectBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  meterIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meterTextColumn: {
    flex: 1,
    marginRight: 10,
  },
  meterTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  meterSubtitleText: {
    fontSize: 11,
    marginTop: 1,
  },
  thresholdsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 10,
  },
  thresholdCard: {
    width: '48%',
    marginHorizontal: '1%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  thresholdIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 5,
  },
  thresholdLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  thresholdValue: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  thresholdUnit: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'System',
  },
  editThresholdsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  editThresholdsBtnText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '700',
  },
  techToggleRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  techToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rawTelemetryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rawTelemetryBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  rawTelemetryText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  versionText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
