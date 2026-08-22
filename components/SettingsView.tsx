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
  CheckCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  PlayIcon,
  StopIcon,
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
  hardwareStatus: 'active' | 'standby';
}

const METER_CONFIGS: MeterConfigItem[] = [
  {
    id: 'wqi',
    title: 'Índice Global de Calidad (WQI)',
    subtitle: 'Puntaje de pureza consolidado y diagnóstico',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.3)',
    renderIcon: (c) => <ActivityIcon size={16} color={c} />,
    hardwareStatus: 'active',
  },
  {
    id: 'ph',
    title: 'Medidor de pH (pH-4502C)',
    subtitle: 'Sonda analógica activa con lectura en vivo (0 - 14)',
    color: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.12)',
    iconBorder: 'rgba(14, 165, 233, 0.3)',
    renderIcon: (c) => <DropletIcon size={16} color={c} />,
    hardwareStatus: 'active',
  },
  {
    id: 'temperature',
    title: 'Medidor de Temperatura',
    subtitle: 'Arco térmico 240° · Esperando conexión de sonda',
    color: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconBorder: 'rgba(239, 68, 68, 0.3)',
    renderIcon: (c) => <ThermometerIcon size={16} color={c} />,
    hardwareStatus: 'standby',
  },
  {
    id: 'conductivity',
    title: 'Conductividad Eléctrica',
    subtitle: 'Gráfico spline de iones · Esperando sensor',
    color: '#EAB308',
    iconBg: 'rgba(234, 179, 8, 0.12)',
    iconBorder: 'rgba(234, 179, 8, 0.3)',
    renderIcon: (c) => <ZapIcon size={16} color={c} />,
    hardwareStatus: 'standby',
  },
  {
    id: 'turbidity',
    title: 'Medidor de Turbidez',
    subtitle: 'Barra óptica NTU · Esperando sensor',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.3)',
    renderIcon: (c) => <WavesIcon size={16} color={c} />,
    hardwareStatus: 'standby',
  },
];

// ─────────────────────────────────────────────────────────────
// Vista principal: SettingsView (Pestaña de Ajustes y Hardware)
// ─────────────────────────────────────────────────────────────

export const SettingsView: React.FC = () => {
  const {
    visibleMeters,
    toggleMeter,
    setVisibleMeters,
    resetVisibleMeters,
    alertRanges,
    isConnected,
    isScanning,
    connectionMode,
    setConnectionMode,
    bleStatus,
    bleDevices,
    connectedDeviceName,
    connectedDeviceId,
    bleError,
    startBleScan,
    stopBleScan,
    connectBleDevice,
    disconnectBleDevice,
    processTelemetryString,
    connect,
    disconnect,
    ph,
    phClassification,
    adc,
    voltage,
    rawTelemetry,
    theme,
  } = useSensorStore();

  const isDark = theme === 'dark';
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Cantidad de medidores activos
  const activeCount = Object.values(visibleMeters).filter(Boolean).length;

  const handleToggleAll = () => {
    if (activeCount === 5) {
      setVisibleMeters({
        wqi: true,
        ph: true,
        temperature: false,
        conductivity: false,
        turbidity: false,
      });
    } else {
      resetVisibleMeters();
    }
  };

  const getPhClassificationBadge = () => {
    if (phClassification === 'ÁCIDO') {
      return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', text: '#EF4444' };
    }
    if (phClassification === 'NEUTRO') {
      return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', text: '#10B981' };
    }
    return { bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)', text: '#C084FC' };
  };

  const phBadge = getPhClassificationBadge();

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Cabecera ── */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.mainHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          Ajustes y Conexión Hardware
        </Text>
        <Text style={[styles.subHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          Administra la conexión Bluetooth con el ESP32, telemetría del pH y calibración
        </Text>
      </View>

      {/* ── SECCIÓN 1: CONEXIÓN BLUETOOTH BLE CON ESP32 ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Conectividad Bluetooth BLE (ESP32)
          </Text>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                borderColor: isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.25)',
              },
            ]}
          >
            <Text style={[styles.countText, { color: isConnected ? '#10B981' : '#94A3B8' }]}>
              {isConnected ? 'EN LÍNEA' : 'DESCONECTADO'}
            </Text>
          </View>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
        >
          <View style={styles.cardContent}>
            {/* Selector de Modo: Hardware Real vs Simulación */}
            <View style={[styles.modeSelectorRow, { backgroundColor: isDark ? '#11161F' : '#F1F5F9' }]}>
              <TouchableOpacity
                onPress={() => setConnectionMode('bluetooth')}
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  connectionMode === 'bluetooth' && {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
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
                  ESP32 BLE Real
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
                    shadowOpacity: 0.1,
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

            {/* Dispositivo conectado actualmente */}
            {isConnected && (
              <View
                style={[
                  styles.activeDeviceCard,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.iconWrap, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.35)' }]}>
                    <BluetoothIcon size={18} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.bleTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                      {connectedDeviceName || 'ESP32 pH Sonda'}
                    </Text>
                    <Text style={[styles.bleSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {connectedDeviceId ? `ID: ${connectedDeviceId}` : 'Enlace UART Activo (12-bit ADC)'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={disconnect}
                  activeOpacity={0.7}
                  style={styles.disconnectMiniBtn}
                >
                  <Text style={styles.disconnectMiniText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botones de Control BLE */}
            {!isConnected && connectionMode === 'bluetooth' && (
              <View>
                <TouchableOpacity
                  onPress={isScanning ? stopBleScan : startBleScan}
                  activeOpacity={0.8}
                  style={[
                    styles.bleActionBtn,
                    {
                      backgroundColor: isScanning ? 'rgba(251,191,36,0.12)' : 'rgba(14,165,233,0.12)',
                      borderColor: isScanning ? 'rgba(251,191,36,0.4)' : 'rgba(14,165,233,0.4)',
                    },
                  ]}
                >
                  {isScanning ? (
                    <>
                      <ActivityIndicator size="small" color="#FBBF24" style={{ marginRight: 8 }} />
                      <Text style={[styles.bleActionBtnText, { color: '#FBBF24' }]}>
                        Buscando dispositivos ESP32...
                      </Text>
                    </>
                  ) : (
                    <>
                      <BluetoothIcon size={16} color="#0EA5E9" />
                      <Text style={[styles.bleActionBtnText, { color: '#0EA5E9' }]}>
                        Escanear Dispositivos ESP32 BLE
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Lista de Dispositivos Descubiertos */}
                {bleDevices.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.devicesListHeader, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Dispositivos Detectados ({bleDevices.length}):
                    </Text>

                    {bleDevices.map((dev) => {
                      const isEsp = (dev.name || '').toLowerCase().includes('esp') || (dev.name || '').toLowerCase().includes('ph');
                      return (
                        <TouchableOpacity
                          key={dev.id}
                          onPress={() => connectBleDevice(dev.id)}
                          activeOpacity={0.7}
                          style={[
                            styles.deviceListItem,
                            {
                              backgroundColor: isEsp
                                ? isDark ? 'rgba(14,165,233,0.08)' : '#F0F9FF'
                                : isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                              borderColor: isEsp
                                ? '#0EA5E9'
                                : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.deviceItemName, { color: isEsp ? '#0EA5E9' : (isDark ? '#F1F5F9' : '#0F172A') }]}>
                                {dev.name || 'Dispositivo Desconocido'}
                              </Text>
                              {isEsp && (
                                <View style={styles.espBadge}>
                                  <Text style={styles.espBadgeText}>ESP32 DETECTADO</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.deviceItemId, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                              {dev.id} {dev.rssi !== null ? `· ${dev.rssi} dBm` : ''}
                            </Text>
                          </View>

                          <View style={[styles.connectDeviceBtn, isEsp && { backgroundColor: '#0EA5E9' }]}>
                            <Text style={styles.connectDeviceBtnText}>Conectar</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {bleDevices.length === 0 && !isScanning && (
                  <Text style={[styles.scanHintText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    Asegúrate de que el ESP32 esté encendido con el Bluetooth activado y transmitiendo datos.
                  </Text>
                )}
              </View>
            )}

            {/* En modo simulación */}
            {!isConnected && connectionMode === 'simulation' && (
              <TouchableOpacity
                onPress={connect}
                activeOpacity={0.8}
                style={[
                  styles.bleActionBtn,
                  {
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    borderColor: 'rgba(16,185,129,0.4)',
                  },
                ]}
              >
                <PlayIcon size={16} color="#10B981" />
                <Text style={[styles.bleActionBtnText, { color: '#10B981' }]}>
                  Iniciar Simulación de Telemetría pH
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 2: TELEMETRÍA TÉCNICA DEL ESP32 (DEPURACIÓN Y CALIBRACIÓN) ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Telemetría Técnica del Sensor pH
          </Text>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: 'rgba(14,165,233,0.12)',
                borderColor: 'rgba(14,165,233,0.3)',
              },
            ]}
          >
            <Text style={[styles.countText, { color: '#0EA5E9' }]}>pH-4502C</Text>
          </View>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
        >
          <View style={styles.cardContent}>
            {/* Grid de valores técnicos: ADC, Voltaje, pH */}
            <View style={styles.techMetricsGrid}>
              {/* ADC */}
              <View
                style={[
                  styles.techMetricCard,
                  {
                    backgroundColor: isDark ? 'rgba(14,165,233,0.06)' : '#F0F9FF',
                    borderColor: isDark ? 'rgba(14,165,233,0.2)' : '#BAE6FD',
                  },
                ]}
              >
                <Text style={[styles.techMetricLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                  ADC (12-bit)
                </Text>
                <Text style={[styles.techMetricValue, { color: '#0EA5E9' }]}>
                  {adc !== null ? adc.toFixed(2) : '--'}
                </Text>
                <Text style={[styles.techMetricSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Rango: 0 a 4095
                </Text>
              </View>

              {/* Voltaje */}
              <View
                style={[
                  styles.techMetricCard,
                  {
                    backgroundColor: isDark ? 'rgba(234,179,8,0.06)' : '#FFFBEB',
                    borderColor: isDark ? 'rgba(234,179,8,0.2)' : '#FDE68A',
                  },
                ]}
              >
                <Text style={[styles.techMetricLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                  Voltaje Analógico
                </Text>
                <Text style={[styles.techMetricValue, { color: '#FACC15' }]}>
                  {voltage !== null ? `${voltage.toFixed(2)} V` : '--'}
                </Text>
                <Text style={[styles.techMetricSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Entrada: 0.0 - 3.3V
                </Text>
              </View>

              {/* Nivel de pH con clasificación */}
              <View
                style={[
                  styles.techMetricCard,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0',
                  },
                ]}
              >
                <Text style={[styles.techMetricLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                  pH Calculado
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.techMetricValue, { color: '#10B981' }]}>
                    {ph.toFixed(2)}
                  </Text>
                  <View
                    style={[
                      styles.classificationBadge,
                      {
                        backgroundColor: phBadge.bg,
                        borderColor: phBadge.border,
                      },
                    ]}
                  >
                    <Text style={[styles.classificationText, { color: phBadge.text }]}>
                      {phClassification}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.techMetricSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Escala: 0 a 14 pH
                </Text>
              </View>
            </View>

            {/* Consola de paquete crudo recibido */}
            <View style={styles.consoleContainer}>
              <View style={styles.consoleHeader}>
                <Text style={styles.consoleTitle}>ÚLTIMA TRAMA DE ENTRADA (RAW BLE):</Text>
                <View style={styles.consoleStatusDot} />
              </View>
              <View style={styles.consoleBox}>
                <Text style={styles.consoleText}>
                  {rawTelemetry || 'ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00'}
                </Text>
              </View>

              {/* Botones de Prueba Rápida de Telemetría */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.quickTestHeader, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  PROBAR FORMATO DE TELEMETRÍA ESP32:
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => processTelemetryString('ADC: 1350.00 | Voltaje: 1.08 V | pH: 5.20')}
                    activeOpacity={0.7}
                    style={[styles.quickTestBtn, { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.1)' }]}
                  >
                    <Text style={[styles.quickTestText, { color: '#EF4444' }]}>Ácido (5.20)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => processTelemetryString('ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00')}
                    activeOpacity={0.7}
                    style={[styles.quickTestBtn, { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.1)' }]}
                  >
                    <Text style={[styles.quickTestText, { color: '#10B981' }]}>Neutro (7.00)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => processTelemetryString('ADC: 2850.00 | Voltaje: 2.30 V | pH: 8.80')}
                    activeOpacity={0.7}
                    style={[styles.quickTestBtn, { borderColor: 'rgba(192,132,252,0.4)', backgroundColor: 'rgba(192,132,252,0.1)' }]}
                  >
                    <Text style={[styles.quickTestText, { color: '#C084FC' }]}>Alcalino (8.80)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Estado de Hardware de Sensores */}
            <View style={[styles.hardwareStatusContainer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.hardwareStatusTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                ESTADO DE SENSORES FÍSICOS:
              </Text>
              
              <View style={styles.sensorStatusRow}>
                <View style={styles.sensorStatusIndicator}>
                  <View style={[styles.sensorDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.sensorStatusName, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Sensor pH (pH-4502C):
                  </Text>
                </View>
                <Text style={[styles.sensorStatusState, { color: '#10B981' }]}>
                  CONECTADO / TRANSMITIENDO
                </Text>
              </View>

              <View style={styles.sensorStatusRow}>
                <View style={styles.sensorStatusIndicator}>
                  <View style={[styles.sensorDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.sensorStatusName, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Temperatura, Turbidez, Conductividad:
                  </Text>
                </View>
                <Text style={[styles.sensorStatusState, { color: '#F59E0B' }]}>
                  PENDIENTE (Sin hardware)
                </Text>
              </View>
            </View>
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 3: FILTRO DE MEDIDORES EN EL DASHBOARD ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Medidores en Pantalla
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isDark ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.08)',
                  borderColor: isDark ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.2)',
                },
              ]}
            >
              <Text style={styles.countText}>{activeCount} / 5 ACTIVOS</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleToggleAll} activeOpacity={0.7}>
            <Text style={[styles.toggleAllBtn, { color: '#0EA5E9' }]}>
              {activeCount === 5 ? 'Ocultar otros' : 'Activar todos'}
            </Text>
          </TouchableOpacity>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
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
                      styles.iconWrap,
                      {
                        backgroundColor: meter.iconBg,
                        borderColor: meter.iconBorder,
                      },
                    ]}
                  >
                    {meter.renderIcon(meter.color)}
                  </View>

                  <View style={styles.meterTextCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.meterTitle,
                          {
                            color: isEnabled
                              ? isDark ? '#F1F5F9' : '#0F172A'
                              : isDark ? '#64748B' : '#94A3B8',
                          },
                        ]}
                      >
                        {meter.title}
                      </Text>
                      {meter.hardwareStatus === 'active' ? (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Activo</Text>
                        </View>
                      ) : (
                        <View style={styles.standbyPill}>
                          <Text style={styles.standbyPillText}>Standby</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.meterSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
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
                    thumbColor={isEnabled ? '#0EA5E9' : isDark ? '#71717a' : '#94A3B8'}
                  />
                </View>
              );
            })}
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 4: CALIBRACIÓN Y UMBRALES DE ALERTA ── */}
      <View style={{ marginBottom: 18 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Calibración de Umbrales
          </Text>
          <TouchableOpacity onPress={() => setIsConfigModalOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.toggleAllBtn, { color: '#0EA5E9' }]}>
              Editar
            </Text>
          </TouchableOpacity>
        </View>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
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
                <View style={styles.thresholdCardHeader}>
                  <View
                    style={[
                      styles.thresholdMiniIcon,
                      {
                        backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE',
                        borderColor: isDark ? 'rgba(14,165,233,0.35)' : '#7DD3FC',
                      },
                    ]}
                  >
                    <DropletIcon size={12} color={isDark ? '#38BDF8' : '#0284C7'} />
                  </View>
                  <Text style={[styles.thresholdCardLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    pH Neutro / Óptimo
                  </Text>
                </View>
                <Text style={[styles.thresholdCardValue, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
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
                <View style={styles.thresholdCardHeader}>
                  <View
                    style={[
                      styles.thresholdMiniIcon,
                      {
                        backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                        borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#FCA5A5',
                      },
                    ]}
                  >
                    <ThermometerIcon size={12} color={isDark ? '#F87171' : '#DC2626'} />
                  </View>
                  <Text style={[styles.thresholdCardLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Temp. Ideal
                  </Text>
                </View>
                <Text style={[styles.thresholdCardValue, { color: isDark ? '#F87171' : '#DC2626' }]}>
                  {alertRanges.temperature.min} – {alertRanges.temperature.max} <Text style={styles.thresholdUnit}>°C</Text>
                </Text>
              </View>

              {/* Conductividad */}
              <View
                style={[
                  styles.thresholdCard,
                  {
                    backgroundColor: isDark ? 'rgba(234,179,8,0.06)' : '#FFFBEB',
                    borderColor: isDark ? 'rgba(234,179,8,0.2)' : '#FDE68A',
                  },
                ]}
              >
                <View style={styles.thresholdCardHeader}>
                  <View
                    style={[
                      styles.thresholdMiniIcon,
                      {
                        backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : '#FEF3C7',
                        borderColor: isDark ? 'rgba(234,179,8,0.35)' : '#FDE68A',
                      },
                    ]}
                  >
                    <ZapIcon size={12} color={isDark ? '#FACC15' : '#D97706'} />
                  </View>
                  <Text style={[styles.thresholdCardLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Conductividad
                  </Text>
                </View>
                <Text style={[styles.thresholdCardValue, { color: isDark ? '#FACC15' : '#D97706' }]}>
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
                <View style={styles.thresholdCardHeader}>
                  <View
                    style={[
                      styles.thresholdMiniIcon,
                      {
                        backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
                        borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#6EE7B7',
                      },
                    ]}
                  >
                    <WavesIcon size={12} color={isDark ? '#34D399' : '#059669'} />
                  </View>
                  <Text style={[styles.thresholdCardLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    Turbidez Máx
                  </Text>
                </View>
                <Text style={[styles.thresholdCardValue, { color: isDark ? '#34D399' : '#059669' }]}>
                  ≤ {alertRanges.turbidity.max} <Text style={styles.thresholdUnit}>NTU</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsConfigModalOpen(true)}
              activeOpacity={0.75}
              style={[
                styles.configActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.06)',
                  borderColor: isDark ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.2)',
                },
              ]}
            >
              <SettingsIcon size={14} color="#0EA5E9" />
              <Text style={styles.configActionText}>Calibrar y Configurar Umbrales</Text>
            </TouchableOpacity>
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 5: INFORMACIÓN DEL SISTEMA ── */}
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <Text style={[styles.versionText, { color: isDark ? '#475569' : '#94A3B8' }]}>
          TPH Monitor IoT v2.5.0 · ESP32 BLE pH Engine
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subHeading: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleAllBtn: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
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
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
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
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  disconnectMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  disconnectMiniText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  bleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  bleActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  devicesListHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  deviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  deviceItemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceItemId: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  connectDeviceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
  },
  connectDeviceBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scanHintText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  techMetricsGrid: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  techMetricCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  techMetricLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  techMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  techMetricSub: {
    fontSize: 8,
    marginTop: 2,
  },
  classificationBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  classificationText: {
    fontSize: 8,
    fontWeight: '800',
  },
  consoleContainer: {
    marginBottom: 12,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  consoleTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  consoleStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  consoleBox: {
    backgroundColor: '#0A0D14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
  },
  consoleText: {
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
  },
  hardwareStatusContainer: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  hardwareStatusTitle: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sensorStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sensorStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sensorStatusName: {
    fontSize: 10,
    fontWeight: '600',
  },
  sensorStatusState: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meterTextCol: {
    flex: 1,
    marginRight: 10,
  },
  meterTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  activePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  activePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#10B981',
  },
  standbyPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(100,116,139,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.25)',
  },
  standbyPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
  },
  meterSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  thresholdsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  thresholdCard: {
    width: '50%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  thresholdCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  thresholdMiniIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  thresholdCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  thresholdCardValue: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  thresholdUnit: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'System',
  },
  configActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  configActionText: {
    color: '#0EA5E9',
    fontSize: 11,
    fontWeight: '700',
  },
  bleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bleSubtitle: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  versionText: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  espBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.4)',
  },
  espBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  quickTestHeader: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quickTestBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTestText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
