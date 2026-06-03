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
} from 'react-native';
import { useSensorStore, type AlertRanges } from '../store/useSensorStore';

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
    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] font-bold uppercase tracking-widest mb-2 px-1`}>
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
      {unit && <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-xs font-bold ml-2`}>{unit}</Text>}
    </View>
  </View>
);

export const ConfigModal: React.FC<ConfigModalProps> = ({ visible, onClose }) => {
  const { alertRanges, updateAlertRanges, theme } = useSensorStore();
  const isDark = theme === 'dark';

  // Estados locales para los inputs
  const [phMin, setPhMin] = useState(alertRanges.ph.min.toString());
  const [phMax, setPhMax] = useState(alertRanges.ph.max.toString());
  const [denMin, setDenMin] = useState(alertRanges.density.min.toString());
  const [denMax, setDenMax] = useState(alertRanges.density.max.toString());
  const [turMax, setTurMax] = useState(alertRanges.turbidity.max.toString());

  // Sincronizar cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setPhMin(alertRanges.ph.min.toString());
      setPhMax(alertRanges.ph.max.toString());
      setDenMin(alertRanges.density.min.toString());
      setDenMax(alertRanges.density.max.toString());
      setTurMax(alertRanges.turbidity.max.toString());
    }
  }, [visible, alertRanges]);

  const handleSave = () => {
    updateAlertRanges({
      ph: { min: parseFloat(phMin) || 0, max: parseFloat(phMax) || 14 },
      density: { min: parseFloat(denMin) || 0, max: parseFloat(denMax) || 2 },
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
                <View>
                  <Text className={`${isDark ? 'text-white' : 'text-slate-900'} text-xl font-bold`}>Límites de Alerta</Text>
                  <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-xs font-medium`}>Ajuste de umbrales industriales</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-xl font-bold`}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Formulario */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2">
                  <InputField label="pH Mínimo" value={phMin} onChange={setPhMin} unit="pH" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="pH Máximo" value={phMax} onChange={setPhMax} unit="pH" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Dens. Mín" value={denMin} onChange={setDenMin} unit="g/cm³" isDark={isDark} />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Dens. Máx" value={denMax} onChange={setDenMax} unit="g/cm³" isDark={isDark} />
                </View>
                <View className="w-full px-2">
                  <InputField label="Umbral Turbidez Máx" value={turMax} onChange={setTurMax} unit="NTU" isDark={isDark} />
                </View>
              </View>

              {/* Botones */}
              <View className="flex-row mt-6 gap-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className={`flex-1 py-4 rounded-2xl ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'} border items-center shadow-sm`}
                >
                  <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} font-bold uppercase tracking-widest text-xs`}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 py-4 rounded-2xl bg-sky-500 items-center shadow-md shadow-sky-500/20"
                >
                  <Text className="text-white font-bold uppercase tracking-widest text-xs">Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
