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
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder, unit }) => (
  <View className="mb-4">
    <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
      {label}
    </Text>
    <View className="flex-row items-center bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
      <TextInput
        className="flex-1 text-white font-mono text-base"
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#52525b"
      />
      {unit && <Text className="text-zinc-600 text-xs font-bold ml-2">{unit}</Text>}
    </View>
  </View>
);

export const ConfigModal: React.FC<ConfigModalProps> = ({ visible, onClose }) => {
  const { alertRanges, updateAlertRanges } = useSensorStore();

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
            <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text className="text-white text-xl font-bold">Límites de Alerta</Text>
                  <Text className="text-zinc-500 text-xs">Ajuste de umbrales industriales</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <Text className="text-zinc-500 text-xl font-bold">✕</Text>
                </TouchableOpacity>
              </View>

              {/* Formulario */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2">
                  <InputField label="pH Mínimo" value={phMin} onChange={setPhMin} unit="pH" />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="pH Máximo" value={phMax} onChange={setPhMax} unit="pH" />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Dens. Mín" value={denMin} onChange={setDenMin} unit="g/cm³" />
                </View>
                <View className="w-1/2 px-2">
                  <InputField label="Dens. Máx" value={denMax} onChange={setDenMax} unit="g/cm³" />
                </View>
                <View className="w-full px-2">
                  <InputField label="Umbral Turbidez Máx" value={turMax} onChange={setTurMax} unit="NTU" />
                </View>
              </View>

              {/* Botones */}
              <View className="flex-row mt-6 gap-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800 border border-zinc-700 items-center"
                >
                  <Text className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 items-center"
                >
                  <Text className="text-zinc-900 font-bold uppercase tracking-widest text-xs">Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
