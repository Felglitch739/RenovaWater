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

  // 1. Formato Compacto Beacon / Broadcast: "P:7.20,V:1.65" o "P:7.20, V:1.65" o "P:7.20|V:1.65"
  const pMatch = trimmed.match(/P(?:H)?\s*[:=]\s*([\d.]+)/i);
  const vMatch = trimmed.match(/V(?:OLT(?:AJE)?)?\s*[:=]\s*([\d.]+)/i);
  const aMatch = trimmed.match(/A(?:DC)?\s*[:=]\s*([\d.]+)/i);

  if (pMatch) {
    const ph = parseFloat(pMatch[1]);
    if (!isNaN(ph)) {
      const voltage = vMatch ? parseFloat(vMatch[1]) : 0;
      // Estimar ADC proporcional a 3.3V (0-4095) si no viene explícito
      const adc = aMatch ? parseFloat(aMatch[1]) : (voltage > 0 ? Math.round((voltage / 3.3) * 4095) : 0);

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

  // 2. Intento con regex exacto / estándar legacy:
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

  // 3. Intento flexible si los campos vienen en orden distinto o con separadores alternativos
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

  // 4. Intento formato JSON en caso de que se configure así en el firmware
  try {
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
      const json = JSON.parse(jsonStr);
      const phVal = Number(json.P ?? json.p ?? json.ph ?? json.pH);
      if (!isNaN(phVal)) {
        const voltVal = Number(json.V ?? json.v ?? json.voltage ?? json.voltaje ?? json.Voltaje ?? 0);
        const adcVal = Number(json.A ?? json.a ?? json.adc ?? json.ADC ?? (voltVal > 0 ? (voltVal / 3.3) * 4095 : 0));
        return {
          adc: isNaN(adcVal) ? 0 : adcVal,
          voltage: isNaN(voltVal) ? 0 : voltVal,
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
