/**
 * services/telemetryParser.ts
 * 
 * Parser especializado para la telemetría del ESP32 con el sensor de pH (pH-4502C).
 * Formato esperado:
 *   "ADC: [valor] | Voltaje: [valor] V | pH: [valor]"
 * Ejemplo:
 *   "ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00"
 */

export type PhClassification = 'ÁCIDO' | 'NEUTRO' | 'ALCALINO';

export interface TelemetryReading {
  adc: number;
  voltage: number;
  ph: number;
  classification: PhClassification;
  timestamp: Date;
  raw: string;
  isValid: boolean;
}

/**
 * Clasifica el nivel de pH según las reglas estrictas del negocio:
 * - pH < 6.5        → ÁCIDO
 * - 6.5 <= pH <= 7.5 → NEUTRO
 * - pH > 7.5        → ALCALINO
 */
export function classifyPh(ph: number): PhClassification {
  if (ph < 6.5) {
    return 'ÁCIDO';
  }
  if (ph <= 7.5) {
    return 'NEUTRO';
  }
  return 'ALCALINO';
}

/**
 * Parsea una cadena de telemetría entrante del ESP32.
 * 
 * @param text Cadena en texto plano recibida vía Bluetooth BLE
 * @returns Objeto con lecturas numéricas y clasificación de pH
 */
export function parseEsp32Telemetry(text: string): TelemetryReading | null {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Intento con regex exacto / estándar:
  // "ADC: 2048.00 | Voltaje: 1.65 V | pH: 7.00"
  const standardRegex = /ADC:\s*([\d.]+)\s*\|\s*Voltaje:\s*([\d.]+)\s*V?\s*\|\s*pH:\s*([\d.]+)/i;
  const match = trimmed.match(standardRegex);

  if (match) {
    const adc = parseFloat(match[1]);
    const voltage = parseFloat(match[2]);
    const ph = parseFloat(match[3]);

    if (!isNaN(ph)) {
      return {
        adc: isNaN(adc) ? 0 : adc,
        voltage: isNaN(voltage) ? 0 : voltage,
        ph: parseFloat(ph.toFixed(2)),
        classification: classifyPh(ph),
        timestamp: new Date(),
        raw: trimmed,
        isValid: true,
      };
    }
  }

  // 2. Intento flexible si los campos vienen en orden distinto o con separadores alternativos
  const adcMatch = trimmed.match(/ADC:\s*([\d.]+)/i);
  const voltMatch = trimmed.match(/Voltaje:\s*([\d.]+)/i) || trimmed.match(/Voltage:\s*([\d.]+)/i);
  const phMatch = trimmed.match(/pH:\s*([\d.]+)/i);

  if (phMatch) {
    const ph = parseFloat(phMatch[1]);
    const adc = adcMatch ? parseFloat(adcMatch[1]) : 0;
    const voltage = voltMatch ? parseFloat(voltMatch[1]) : 0;

    if (!isNaN(ph)) {
      return {
        adc: isNaN(adc) ? 0 : adc,
        voltage: isNaN(voltage) ? 0 : voltage,
        ph: parseFloat(ph.toFixed(2)),
        classification: classifyPh(ph),
        timestamp: new Date(),
        raw: trimmed,
        isValid: true,
      };
    }
  }

  // 3. Intento formato JSON en caso de que se configure así en el firmware
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const json = JSON.parse(trimmed);
      if (typeof json.ph === 'number' || typeof json.pH === 'number') {
        const phVal = Number(json.ph ?? json.pH);
        const adcVal = Number(json.adc ?? json.ADC ?? 0);
        const voltVal = Number(json.voltage ?? json.voltaje ?? json.Voltaje ?? 0);
        return {
          adc: adcVal,
          voltage: voltVal,
          ph: parseFloat(phVal.toFixed(2)),
          classification: classifyPh(phVal),
          timestamp: new Date(),
          raw: trimmed,
          isValid: true,
        };
      }
    }
  } catch {
    // No es JSON válido
  }

  return null;
}
