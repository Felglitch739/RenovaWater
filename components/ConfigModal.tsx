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
  Image,
} from 'react-native';
import { useSensorStore, type AlertRanges } from '../store/useSensorStore';
import { CloseIcon } from './Icons';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  unit?: string;
  isDark: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, unit, isDark }) => (
  <View className="mb-4">
    <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} text-xs font-semibold mb-2 px-1`}>
      {label}
    </Text>
    <View className={`flex-row items-center ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3 shadow-sm`}>
      <TextInput
        className={`flex-1 ${isDark ? 'text-white' : 'text-slate-900'} font-mono text-base`}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#52525b" : "#94a3b8"}
      />
      {unit && <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-xs font-semibold ml-2`}>{unit}</Text>}
    </View>
  </View>
);

export const ConfigModal: React.FC<ConfigModalProps> = ({ visible, onClose }) => {
  const { alertRanges, updateAlertRanges, theme } = useSensorStore();
  const isDark = theme === 'dark';

  // Estados locales para los inputs
  const [phMin, setPhMin] = useState(alertRanges.ph.min.toString());
  const [phMax, setPhMax] = useState(alertRanges.ph.max.toString());
  const [tempMin, setTempMin] = useState(alertRanges.temperature.min.toString());
  const [tempMax, setTempMax] = useState(alertRanges.temperature.max.toString());
  const [turMax, setTurMax] = useState(alertRanges.turbidity.max.toString());

  // Sincronizar cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setPhMin(alertRanges.ph.min.toString());
      setPhMax(alertRanges.ph.max.toString());
      setTempMin(alertRanges.temperature.min.toString());
      setTempMax(alertRanges.temperature.max.toString());
      setTurMax(alertRanges.turbidity.max.toString());
    }
  }, [visible, alertRanges]);

  const handleSave = () => {
    updateAlertRanges({
      ph: { min: parseFloat(phMin) || 0, max: parseFloat(phMax) || 14 },
      temperature: { min: parseFloat(tempMin) || 0, max: parseFloat(tempMax) || 100 },
      turbidity: { max: parseFloat(turMax) || 0 },
    });
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-center items-center bg-black/80 px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <View className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} border rounded-3xl p-6 shadow-2xl`}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.08)',
                      borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.2)',
                      borderRadius: 12,
                    }}
                    className="border items-center justify-center mr-3 p-1"
                  >
                    <Image
                      source={require('../assets/TPH_Monitor_Icon.png')}
                      style={{ width: 30, height: 30 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View>
                    <Text className={`${isDark ? 'text-white' : 'text-slate-900'} text-lg font-bold`}>
                      Límites de alerta
                    </Text>
                    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-xs font-medium`}>
                      Ajuste de umbrales · TPH Monitor
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <CloseIcon size={20} color={isDark ? '#a1a1aa' : '#64748b'} />
                </TouchableOpacity>
              </View>

              {/* Formulario */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2">
                  <InputField label="pH mínimo" value={phMin} onChange={setPhMin} unit="pH" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="pH máximo" value={phMax} onChange={setPhMax} unit="pH" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Temp. mínima" value={tempMin} onChange={setTempMin} unit="°C" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Temp. máxima" value={tempMax} onChange={setTempMax} unit="°C" isDark={isDark} />
                </View>
                <View className="w-full px-2">
                  <InputField label="Turbidez máxima permitida" value={turMax} onChange={setTurMax} unit="NTU" isDark={isDark} />
                </View>
              </View>

              {/* Botones */}
              <View className="flex-row mt-6 gap-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className={`flex-1 py-3.5 rounded-2xl ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'} border items-center shadow-sm`}
                >
                  <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} font-semibold text-xs`}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 py-3.5 rounded-2xl bg-sky-500 items-center shadow-md shadow-sky-500/20"
                >
                  <Text className="text-white font-bold text-xs">Guardar cambios</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
