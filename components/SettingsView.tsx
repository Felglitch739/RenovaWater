import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
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
  MoonIcon,
  SunIcon,
  CheckCircleIcon,
  InfoIcon,
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
    title: 'Índice Global de Calidad (WQI)',
    subtitle: 'Puntaje de pureza consolidado (0 a 100%) y diagnóstico',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.3)',
    renderIcon: (c) => <ActivityIcon size={16} color={c} />,
  },
  {
    id: 'ph',
    title: 'Medidor de pH',
    subtitle: 'Velocímetro semicircular espectral (0 a 14 pH)',
    color: '#0EA5E9',
    iconBg: 'rgba(14, 165, 233, 0.12)',
    iconBorder: 'rgba(14, 165, 233, 0.3)',
    renderIcon: (c) => <DropletIcon size={16} color={c} />,
  },
  {
    id: 'temperature',
    title: 'Medidor de Temperatura',
    subtitle: 'Arco radial térmico de 240° con gradiente azul-rojo',
    color: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconBorder: 'rgba(239, 68, 68, 0.3)',
    renderIcon: (c) => <ThermometerIcon size={16} color={c} />,
  },
  {
    id: 'conductivity',
    title: 'Conductividad Eléctrica',
    subtitle: 'Gráfico de curva spline de iones disueltos (µS/cm)',
    color: '#EAB308',
    iconBg: 'rgba(234, 179, 8, 0.12)',
    iconBorder: 'rgba(234, 179, 8, 0.3)',
    renderIcon: (c) => <ZapIcon size={16} color={c} />,
  },
  {
    id: 'turbidity',
    title: 'Medidor de Turbidez',
    subtitle: 'Barra de claridad óptica y dispersión (NTU)',
    color: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.3)',
    renderIcon: (c) => <WavesIcon size={16} color={c} />,
  },
];

// ─────────────────────────────────────────────────────────────
// Vista principal: SettingsView (Pestaña de Ajustes)
// ─────────────────────────────────────────────────────────────

export const SettingsView: React.FC = () => {
  const {
    visibleMeters,
    toggleMeter,
    setVisibleMeters,
    resetVisibleMeters,
    alertRanges,
    isConnected,
    connect,
    disconnect,
    theme,
    setTheme,
  } = useSensorStore();

  const isDark = theme === 'dark';
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Cantidad de medidores activos
  const activeCount = Object.values(visibleMeters).filter(Boolean).length;

  const handleToggleAll = () => {
    if (activeCount === 5) {
      // Dejar al menos el WQI activo si desactivan todos
      setVisibleMeters({
        wqi: true,
        ph: false,
        temperature: false,
        conductivity: false,
        turbidity: false,
      });
    } else {
      resetVisibleMeters();
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Cabecera ── */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.mainHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          Ajustes y Personalización
        </Text>
        <Text style={[styles.subHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          Personaliza los medidores visibles y administra la configuración del sistema
        </Text>
      </View>

      {/* ── SECCIÓN 1: FILTRO DE MEDIDORES EN EL DASHBOARD ── */}
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

        {/* Tarjeta de Interruptores con AuraCard */}
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
                  {/* Icono temático */}
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

                  {/* Títulos */}
                  <View style={styles.meterTextCol}>
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
                    <Text style={[styles.meterSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {meter.subtitle}
                    </Text>
                  </View>

                  {/* Switch */}
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

      {/* ── SECCIÓN 2: LÍMITES Y UMBRALES DE ALERTA ── */}
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
            {/* Grid 2x2 de umbrales activos */}
            <View style={styles.thresholdsGrid}>
              {/* 1. pH */}
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
                    pH Óptimo
                  </Text>
                </View>
                <Text style={[styles.thresholdCardValue, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  {alertRanges.ph.min} – {alertRanges.ph.max} <Text style={styles.thresholdUnit}>pH</Text>
                </Text>
              </View>

              {/* 2. Temperatura */}
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

              {/* 3. Conductividad (Nuevo) */}
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

              {/* 4. Turbidez */}
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

            {/* Botón de configuración */}
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

      {/* ── SECCIÓN 3: SONDA INALÁMBRICA BLUETOOTH BLE ── */}
      <View style={{ marginBottom: 18 }}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 8 }]}>
          Telemetría y Sonda BLE
        </Text>

        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
        >
          <View style={styles.cardContent}>
            <View style={styles.bleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(14,165,233,0.12)',
                      borderColor: isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(14,165,233,0.3)',
                    },
                  ]}
                >
                  <BluetoothIcon size={18} color={isConnected ? '#10B981' : '#0EA5E9'} />
                </View>
                <View>
                  <Text style={[styles.bleTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    TPH Sensor Array V2
                  </Text>
                  <Text style={[styles.bleSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    MAC: C4:4F:33:1A:89:B2 · ESP32-WROOM
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.bleStatusBadge,
                  {
                    backgroundColor: isConnected ? 'rgba(16,185,129,0.14)' : 'rgba(100,116,139,0.14)',
                    borderColor: isConnected ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.25)',
                  },
                ]}
              >
                <Text style={{ color: isConnected ? '#10B981' : '#94A3B8', fontSize: 9, fontWeight: '800' }}>
                  {isConnected ? 'CONECTADO' : 'STANDBY'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={isConnected ? disconnect : connect}
              activeOpacity={0.75}
              style={[
                styles.bleConnectBtn,
                isConnected
                  ? { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }
                  : { backgroundColor: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.3)' },
              ]}
            >
              <Text style={{ color: isConnected ? '#EF4444' : '#0EA5E9', fontSize: 11, fontWeight: '700' }}>
                {isConnected ? 'Desconectar Sonda' : 'Conectar y Sincronizar'}
              </Text>
            </TouchableOpacity>
          </View>
        </AuraCard>
      </View>

      {/* ── SECCIÓN 4: INFORMACIÓN DEL SISTEMA ── */}
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <Text style={[styles.versionText, { color: isDark ? '#475569' : '#94A3B8' }]}>
          TPH Monitor IoT v2.4.0 · Aqua Sensing System
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
    color: '#0EA5E9',
    letterSpacing: 0.5,
  },
  toggleAllBtn: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
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
  bleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  bleStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  bleConnectBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});
