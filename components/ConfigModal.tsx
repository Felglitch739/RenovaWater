import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSensorStore, type AlertRanges } from '../store/useSensorStore';
import {
  CloseIcon,
  DropletIcon,
  ThermometerIcon,
  ZapIcon,
  WavesIcon,
  RotateCcwIcon,
  CheckCircleIcon,
} from './Icons';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ParameterSectionProps {
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  isDark: boolean;
  children: React.ReactNode;
}

const ParameterSection: React.FC<ParameterSectionProps> = ({
  title,
  subtitle,
  color,
  bgColor,
  borderColor,
  icon,
  isDark,
  children,
}) => (
  <View
    style={[
      modalStyles.sectionBox,
      {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      },
    ]}
  >
    {/* Cabecera del parámetro */}
    <View style={modalStyles.sectionHeader}>
      <View
        style={[
          modalStyles.sectionIconWrap,
          { backgroundColor: bgColor, borderColor: borderColor },
        ]}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[modalStyles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          {title}
        </Text>
        <Text style={[modalStyles.sectionSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          {subtitle}
        </Text>
      </View>
    </View>

    {/* Inputs en grid */}
    <View style={modalStyles.inputsRow}>{children}</View>
  </View>
);

interface NumberInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit: string;
  placeholder?: string;
  isDark: boolean;
  accentColor?: string;
  isFullWidth?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  unit,
  placeholder,
  isDark,
  accentColor = '#0EA5E9',
  isFullWidth = false,
}) => (
  <View style={[modalStyles.inputCol, isFullWidth && { width: '100%' }]}>
    <Text style={[modalStyles.inputLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>
      {label}
    </Text>
    <View
      style={[
        modalStyles.inputContainer,
        {
          backgroundColor: isDark ? '#181E26' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
        },
      ]}
    >
      <TextInput
        style={[
          modalStyles.textInput,
          { color: isDark ? '#F8FAFC' : '#0F172A' },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
        selectTextOnFocus
      />
      <View
        style={[
          modalStyles.unitBadge,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          },
        ]}
      >
        <Text style={[modalStyles.unitText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          {unit}
        </Text>
      </View>
    </View>
  </View>
);

import { useShallow } from 'zustand/react/shallow';

export const ConfigModal: React.FC<ConfigModalProps> = ({ visible, onClose }) => {
  const { alertRanges, updateAlertRanges, theme } = useSensorStore(useShallow(state => ({
    alertRanges: state.alertRanges,
    updateAlertRanges: state.updateAlertRanges,
    theme: state.theme,
  })));
  const isDark = theme === 'dark';

  // Estados locales para los inputs
  const [phMin, setPhMin] = useState(alertRanges.ph.min.toString());
  const [phMax, setPhMax] = useState(alertRanges.ph.max.toString());
  const [tempMin, setTempMin] = useState(alertRanges.temperature.min.toString());
  const [tempMax, setTempMax] = useState(alertRanges.temperature.max.toString());
  const [condMin, setCondMin] = useState((alertRanges.conductivity?.min ?? 250).toString());
  const [condMax, setCondMax] = useState((alertRanges.conductivity?.max ?? 750).toString());
  const [turMax, setTurMax] = useState(alertRanges.turbidity.max.toString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronizar cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setPhMin(alertRanges.ph.min.toString());
      setPhMax(alertRanges.ph.max.toString());
      setTempMin(alertRanges.temperature.min.toString());
      setTempMax(alertRanges.temperature.max.toString());
      setCondMin((alertRanges.conductivity?.min ?? 250).toString());
      setCondMax((alertRanges.conductivity?.max ?? 750).toString());
      setTurMax(alertRanges.turbidity.max.toString());
      setErrorMsg(null);
    }
  }, [visible, alertRanges]);

  const handleResetDefaults = () => {
    setPhMin('6.5');
    setPhMax('8.5');
    setTempMin('20.0');
    setTempMax('35.0');
    setCondMin('250');
    setCondMax('750');
    setTurMax('5.0');
    setErrorMsg(null);
  };

  const handleSave = () => {
    const pMin = parseFloat(phMin);
    const pMax = parseFloat(phMax);
    const tMin = parseFloat(tempMin);
    const tMax = parseFloat(tempMax);
    const cMin = parseFloat(condMin);
    const cMax = parseFloat(condMax);
    const tuMax = parseFloat(turMax);

    if (isNaN(pMin) || isNaN(pMax) || isNaN(tMin) || isNaN(tMax) || isNaN(cMin) || isNaN(cMax) || isNaN(tuMax)) {
      setErrorMsg('Por favor introduce valores numéricos válidos en todos los campos.');
      return;
    }

    if (pMin >= pMax) {
      setErrorMsg('El pH mínimo debe ser menor que el pH máximo.');
      return;
    }

    if (tMin >= tMax) {
      setErrorMsg('La temperatura mínima debe ser menor que la máxima.');
      return;
    }

    if (cMin >= cMax) {
      setErrorMsg('La conductividad mínima debe ser menor que la máxima.');
      return;
    }

    if (tuMax <= 0) {
      setErrorMsg('La turbidez máxima debe ser mayor a 0 NTU.');
      return;
    }

    updateAlertRanges({
      ph: { min: pMin, max: pMax },
      temperature: { min: tMin, max: tMax },
      conductivity: { min: cMin, max: cMax },
      turbidity: { max: tuMax },
    });

    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={modalStyles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={modalStyles.keyboardWrap}
          >
            <View
              style={[
                modalStyles.modalCard,
                {
                  backgroundColor: isDark ? '#14181F' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                },
              ]}
            >
              {/* ── Header ── */}
              <View style={modalStyles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={[
                      modalStyles.headerIconCircle,
                      {
                        backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE',
                        borderColor: isDark ? 'rgba(14,165,233,0.35)' : '#7DD3FC',
                      },
                    ]}
                  >
                    <CheckCircleIcon size={20} color={isDark ? '#38BDF8' : '#0284C7'} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[modalStyles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                      Calibración de Umbrales
                    </Text>
                    <Text style={[modalStyles.headerSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      Estándares de alerta y tolerancias operativas
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    modalStyles.closeBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Mensaje de error si hay validación fallida */}
              {errorMsg && (
                <View style={modalStyles.errorBanner}>
                  <Text style={modalStyles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* ── Contenido con Scroll para todos los parámetros ── */}
              <ScrollView
                style={modalStyles.formScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, paddingBottom: 16 }}
              >
                {/* 1. pH */}
                <ParameterSection
                  title="Potencial de Hidrógeno (pH)"
                  subtitle="Rango óptimo para consumo e inocuidad (Estándar 6.5 – 8.5)"
                  color="#0EA5E9"
                  bgColor={isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE'}
                  borderColor={isDark ? 'rgba(14,165,233,0.35)' : '#7DD3FC'}
                  icon={<DropletIcon size={16} color={isDark ? '#38BDF8' : '#0284C7'} />}
                  isDark={isDark}
                >
                  <NumberInput
                    label="pH Mínimo"
                    value={phMin}
                    onChange={setPhMin}
                    unit="pH"
                    placeholder="6.5"
                    isDark={isDark}
                  />
                  <NumberInput
                    label="pH Máximo"
                    value={phMax}
                    onChange={setPhMax}
                    unit="pH"
                    placeholder="8.5"
                    isDark={isDark}
                  />
                </ParameterSection>

                {/* 2. Temperatura */}
                <ParameterSection
                  title="Temperatura del Agua"
                  subtitle="Banda ideal térmica para evitar proliferación biológica"
                  color="#EF4444"
                  bgColor={isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2'}
                  borderColor={isDark ? 'rgba(239,68,68,0.35)' : '#FCA5A5'}
                  icon={<ThermometerIcon size={16} color={isDark ? '#F87171' : '#DC2626'} />}
                  isDark={isDark}
                >
                  <NumberInput
                    label="Temp. Mínima"
                    value={tempMin}
                    onChange={setTempMin}
                    unit="°C"
                    placeholder="20.0"
                    isDark={isDark}
                  />
                  <NumberInput
                    label="Temp. Máxima"
                    value={tempMax}
                    onChange={setTempMax}
                    unit="°C"
                    placeholder="35.0"
                    isDark={isDark}
                  />
                </ParameterSection>

                {/* 3. Conductividad Eléctrica (Nuevo) */}
                <ParameterSection
                  title="Conductividad Eléctrica (CE)"
                  subtitle="Concentración de sales disueltas y pureza iónica"
                  color="#EAB308"
                  bgColor={isDark ? 'rgba(234,179,8,0.15)' : '#FEF3C7'}
                  borderColor={isDark ? 'rgba(234,179,8,0.35)' : '#FDE68A'}
                  icon={<ZapIcon size={16} color={isDark ? '#FACC15' : '#D97706'} />}
                  isDark={isDark}
                >
                  <NumberInput
                    label="Conductividad Mín."
                    value={condMin}
                    onChange={setCondMin}
                    unit="µS/cm"
                    placeholder="250"
                    isDark={isDark}
                  />
                  <NumberInput
                    label="Conductividad Máx."
                    value={condMax}
                    onChange={setCondMax}
                    unit="µS/cm"
                    placeholder="750"
                    isDark={isDark}
                  />
                </ParameterSection>

                {/* 4. Turbidez */}
                <ParameterSection
                  title="Turbidez y Claridad Óptica"
                  subtitle="Límite máximo permitido de dispersión lumínica (NOM)"
                  color="#10B981"
                  bgColor={isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5'}
                  borderColor={isDark ? 'rgba(16,185,129,0.35)' : '#6EE7B7'}
                  icon={<WavesIcon size={16} color={isDark ? '#34D399' : '#059669'} />}
                  isDark={isDark}
                >
                  <NumberInput
                    label="Límite Máximo de Turbidez"
                    value={turMax}
                    onChange={setTurMax}
                    unit="NTU"
                    placeholder="5.0"
                    isDark={isDark}
                    isFullWidth
                  />
                </ParameterSection>

                {/* Botón Restablecer valores estándar */}
                <TouchableOpacity
                  onPress={handleResetDefaults}
                  activeOpacity={0.7}
                  style={[
                    modalStyles.resetDefaultsBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    },
                  ]}
                >
                  <RotateCcwIcon size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text style={[modalStyles.resetDefaultsText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Restablecer valores estándar sugeridos
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* ── Botones de Acción ── */}
              <View
                style={[
                  modalStyles.footerRow,
                  {
                    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.75}
                  style={[
                    modalStyles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                    },
                  ]}
                >
                  <Text style={[modalStyles.cancelBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  style={modalStyles.saveBtn}
                >
                  <Text style={modalStyles.saveBtnText}>Guardar Umbrales</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  formScrollView: {
    maxHeight: 420,
  },
  sectionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 9,
    marginTop: 1,
  },
  inputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  inputCol: {
    width: '50%',
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    height: 38,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingVertical: 0,
  },
  unitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitText: {
    fontSize: 9,
    fontWeight: '700',
  },
  resetDefaultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  resetDefaultsText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.4,
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

