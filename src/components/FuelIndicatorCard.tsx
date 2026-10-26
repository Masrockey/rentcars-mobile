import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brand';

export type FuelIndicatorModel = 'dial' | 'ladder' | 'box';

export interface FuelIndicatorCardProps {
  fuelPercent: number;
  onFuelPercentChange: (percent: number) => void;
  fuelRangeKm: string;
  onFuelRangeKmChange: (km: string) => void;
  initialModel?: FuelIndicatorModel;
  title?: string;
  rangeLabel?: string;
  carMaxKmRange?: number;
}

export const getFuelFractionLabel = (percent: number): string => {
  if (percent <= 5) return 'Empty';
  if (percent < 45) return '1/4';
  if (percent < 70) return '1/2';
  if (percent < 90) return '3/4';
  return 'Full';
};

const MODEL_OPTIONS: { id: FuelIndicatorModel; label: string }[] = [
  { id: 'dial', label: 'Model 1: Dial / Busur' },
  { id: 'ladder', label: 'Model 2: Tangga (Vertikal)' },
  { id: 'box', label: 'Model 3: Kotak (Horisontal)' },
];

const PRESET_PERCENTS = [0, 15, 25, 43, 50, 75, 100];

export const FuelIndicatorCard: React.FC<FuelIndicatorCardProps> = ({
  fuelPercent,
  onFuelPercentChange,
  fuelRangeKm,
  onFuelRangeKmChange,
  initialModel = 'dial',
  rangeLabel = 'RANGE BBM (KM): *',
  carMaxKmRange = 280,
}) => {
  const [selectedModel, setSelectedModel] = useState<FuelIndicatorModel>(initialModel);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(240);

  const updatePercent = (val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    onFuelPercentChange(clamped);
    onFuelRangeKmChange(String(Math.round((clamped / 100) * carMaxKmRange)));
  };

  const handleSliderLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setSliderWidth(w);
    }
  };

  const panResponder = useMemo(() => {
    const computeAndSetPercent = (locationX: number) => {
      const w = sliderWidth || 240;
      const ratio = Math.max(0, Math.min(1, locationX / w));
      const clamped = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      onFuelPercentChange(clamped);
      onFuelRangeKmChange(String(Math.round((clamped / 100) * carMaxKmRange)));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        computeAndSetPercent(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        computeAndSetPercent(evt.nativeEvent.locationX);
      },
    });
  }, [sliderWidth, carMaxKmRange, onFuelPercentChange, onFuelRangeKmChange]);

  const currentOption = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];
  const fractionLabel = getFuelFractionLabel(fuelPercent);

  // -------------------------------------------------------------
  // MODEL 1: DIAL / BUSUR (SVG SPEEDOMETER)
  // -------------------------------------------------------------
  const renderDialModel = () => {
    // Dimensi arc
    const cx = 120;
    const cy = 100;
    const r = 70;

    // Angle: dari -Math.PI (kiri) ke 0 (kanan)
    const angleRad = -Math.PI + (fuelPercent / 100) * Math.PI;

    // Needle coordinates
    const needleLen = 60;
    const nx = cx + needleLen * Math.cos(angleRad);
    const ny = cy + needleLen * Math.sin(angleRad);

    // Active Arc path coordinates
    const arcStartX = cx - r;
    const arcStartY = cy;
    const arcEndX = cx + r * Math.cos(angleRad);
    const arcEndY = cy + r * Math.sin(angleRad);
    const largeArcFlag = fuelPercent > 100 ? 1 : 0;

    return (
      <View style={styles.modelContentContainer}>
        <Text style={styles.modelTitle}>TAMPILAN MODEL DIAL / BUSUR</Text>

        <View style={styles.dialSvgBox}>
          <Svg width={250} height={120} viewBox="0 0 240 115">
            <Defs>
              <LinearGradient id="fuelGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#ef4444" />
                <Stop offset="45%" stopColor="#f97316" />
                <Stop offset="100%" stopColor="#f59e0b" />
              </LinearGradient>
            </Defs>

            {/* Background Arc (Gray) */}
            <Path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={14}
              strokeLinecap="round"
            />

            {/* Active Arc (Colored) */}
            {fuelPercent > 1 && (
              <Path
                d={`M ${arcStartX} ${arcStartY} A ${r} ${r} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY}`}
                fill="none"
                stroke="url(#fuelGradient)"
                strokeWidth={14}
                strokeLinecap="round"
              />
            )}

            {/* Tick marks: E (0%), 1/4 (25%), 1/2 (50%), 3/4 (75%), F (100%) */}
            {[
              { p: 0, label: 'E' },
              { p: 25, label: '' },
              { p: 50, label: '' },
              { p: 75, label: '' },
              { p: 100, label: 'F' },
            ].map((tick) => {
              const rad = -Math.PI + (tick.p / 100) * Math.PI;
              const innerR = 76;
              const outerR = 86;
              const x1 = cx + innerR * Math.cos(rad);
              const y1 = cy + innerR * Math.sin(rad);
              const x2 = cx + outerR * Math.cos(rad);
              const y2 = cy + outerR * Math.sin(rad);

              return (
                <Line
                  key={tick.p}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#1e293b"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Needle (Red) */}
            <Line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke="#dc2626"
              strokeWidth={3.5}
              strokeLinecap="round"
            />

            {/* Center Pin Hub */}
            <Circle cx={cx} cy={cy} r={9} fill="#dc2626" />
            <Circle cx={cx} cy={cy} r={4} fill="#ffffff" />

            {/* E & F Text Labels */}
            <SvgText
              x={cx - r - 22}
              y={cy + 3}
              fontSize="12"
              fontWeight="bold"
              fill="#64748b"
              textAnchor="middle"
            >
              E
            </SvgText>
            <SvgText
              x={cx + r + 22}
              y={cy + 3}
              fontSize="12"
              fontWeight="bold"
              fill="#64748b"
              textAnchor="middle"
            >
              F
            </SvgText>
          </Svg>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------
  // MODEL 2: TANGGA (VERTIKAL)
  // -------------------------------------------------------------
  const renderLadderModel = () => {
    // 8 tingkat baris balok vertikal
    // Tingkat 1 (bawah): 0 - 12.5%
    // Tingkat 8 (atas): 87.5 - 100%
    const totalBars = 8;
    const activeBarsCount = Math.round((fuelPercent / 100) * totalBars);

    return (
      <View style={styles.modelContentContainer}>
        <Text style={styles.modelTitle}>TAMPILAN MODEL TANGGA (VERTIKAL)</Text>

        <View style={styles.ladderRow}>
          <Text style={styles.ladderEndpointLabel}>F (Full)</Text>

          {/* Frame Tabung Tangga */}
          <View style={styles.ladderTube}>
            {Array.from({ length: totalBars }).map((_, idx) => {
              // idx 0 adalah bar paling atas (F), idx 7 adalah bar paling bawah (E)
              const barLevelFromBottom = totalBars - idx; // 8 di atas, 1 di bawah
              const isActive = activeBarsCount >= barLevelFromBottom;

              let activeColor = '#f59e0b'; // amber default
              if (barLevelFromBottom === 1) {
                activeColor = '#ef4444'; // merah di level terendah
              } else if (barLevelFromBottom === 2) {
                activeColor = '#f97316'; // oranye
              } else if (barLevelFromBottom >= 6) {
                activeColor = '#10b981'; // hijau di level atas
              }

              return (
                <View
                  key={idx}
                  style={[
                    styles.ladderBar,
                    isActive
                      ? { backgroundColor: activeColor }
                      : styles.ladderBarInactive,
                  ]}
                />
              );
            })}
          </View>

          <Text style={styles.ladderEndpointLabel}>E (Empty)</Text>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------
  // MODEL 3: KOTAK (HORISONTAL)
  // -------------------------------------------------------------
  const renderBoxModel = () => {
    // 4 kotak besar horizontal (masing-masing mewakili 25%)
    const totalBoxes = 4;
    const activeBoxesCount = Math.ceil((fuelPercent / 100) * totalBoxes);

    return (
      <View style={styles.modelContentContainer}>
        <Text style={styles.modelTitle}>TAMPILAN MODEL KOTAK (HORISONTAL)</Text>

        {/* E & F Endpoints */}
        <View style={styles.boxHeaderEndpoints}>
          <Text style={styles.boxEndpointLabel}>E (Empty)</Text>
          <Text style={styles.boxEndpointLabel}>F (Full)</Text>
        </View>

        {/* 4 Balok Horisontal */}
        <View style={styles.boxFrame}>
          {Array.from({ length: totalBoxes }).map((_, idx) => {
            const isBoxActive = fuelPercent > 0 && idx < activeBoxesCount;
            let fillColor = '#00b87c'; // hijau pekat seperti di desktop
            if (activeBoxesCount === 1) {
              fillColor = '#f59e0b'; // oranye jika hanya 1 kotak
            }

            return (
              <View
                key={idx}
                style={[
                  styles.boxSegment,
                  isBoxActive
                    ? { backgroundColor: fillColor }
                    : styles.boxSegmentInactive,
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Bagian BBM */}
      <View style={styles.headerTitleRow}>
        <MaterialIcons name="local-gas-station" size={20} color="#f59e0b" />
        <Text style={styles.headerSectionTitle}>INDICATOR FUEL (BBM) *</Text>
      </View>

      {/* 2. Selector Dropdown Model & Badge Persen */}
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setDropdownVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownBtnText} numberOfLines={1}>
            {currentOption.label}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#1e293b" />
        </TouchableOpacity>

        {/* Badge Kuning/Amber: e.g. 43% (1/4) */}
        <View style={styles.fractionBadge}>
          <Text style={styles.fractionBadgeText}>
            {fuelPercent}% ({fractionLabel})
          </Text>
        </View>
      </View>

      {/* 3. Tampilan Model Terpilih (Dial / Tangga / Kotak) */}
      <View style={styles.modelDisplayCard}>
        {selectedModel === 'dial' && renderDialModel()}
        {selectedModel === 'ladder' && renderLadderModel()}
        {selectedModel === 'box' && renderBoxModel()}

        {/* Garis Pemisah Tipis */}
        <View style={styles.cardDivider} />

        {/* 4. Kontrol Slider Level BBM */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderLabel}>Geser Slider Level BBM:</Text>
            <View style={styles.sliderValueBox}>
              <Text style={styles.sliderValueText}>{fuelPercent}%</Text>
            </View>
          </View>

          {/* Touch Track Slider */}
          <View
            style={styles.sliderTouchArea}
            onLayout={handleSliderLayout}
            {...panResponder.panHandlers}
          >
            <View style={styles.sliderTrackBg}>
              <View
                style={[
                  styles.sliderTrackActive,
                  { width: `${fuelPercent}%` },
                ]}
              />
            </View>
            <View
              style={[
                styles.sliderThumb,
                {
                  left: Math.max(
                    0,
                    Math.min(
                      sliderWidth - 22,
                      (fuelPercent / 100) * sliderWidth - 11
                    )
                  ),
                },
              ]}
            />
          </View>

          {/* Endpoint Slider Labels */}
          <View style={styles.sliderEndpointsRow}>
            <Text style={styles.sliderEndpointText}>0% (Empty)</Text>
            <Text style={styles.sliderEndpointText}>100% (Full)</Text>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.presetButtonsRow}>
            {PRESET_PERCENTS.map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[
                  styles.presetPill,
                  fuelPercent === pct && styles.presetPillActive,
                ]}
                onPress={() => updatePercent(pct)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    fuelPercent === pct && styles.presetPillTextActive,
                  ]}
                >
                  {pct}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Garis Pemisah Tipis */}
        <View style={styles.cardDivider} />

        {/* 5. Range BBM (KM) Input Manual Sesuai Desktop */}
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
          <View style={styles.rangeInputBox}>
            <TextInput
              style={styles.rangeInput}
              keyboardType="number-pad"
              value={fuelRangeKm}
              onChangeText={onFuelRangeKmChange}
              placeholder="0"
              selectTextOnFocus
            />
            <Text style={styles.rangeUnit}>KM</Text>
          </View>
        </View>
      </View>

      {/* Modal Pilihan Model Indikator BBM */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Model Indikator BBM</Text>
              <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                <MaterialIcons name="close" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {MODEL_OPTIONS.map((item) => {
              const isSelected = item.id === selectedModel;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownOptionItem,
                    isSelected && styles.dropdownOptionItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedModel(item.id);
                    setDropdownVisible(false);
                  }}
                >
                  <MaterialIcons
                    name={
                      item.id === 'dial'
                        ? 'speed'
                        : item.id === 'ladder'
                          ? 'stairs'
                          : 'view-week'
                    }
                    size={20}
                    color={isSelected ? BrandColors.primary : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={18} color={BrandColors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.3,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  fractionBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fractionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  modelDisplayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  modelContentContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  modelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Model 1: Dial Busur
  dialSvgBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },

  // Model 2: Tangga Vertikal
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  ladderEndpointLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 60,
    textAlign: 'center',
  },
  ladderTube: {
    width: 68,
    height: 140,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 5,
    justifyContent: 'space-between',
  },
  ladderBar: {
    width: '100%',
    height: 11,
    borderRadius: 3,
  },
  ladderBarInactive: {
    backgroundColor: '#f1f5f9',
  },

  // Model 3: Kotak Horisontal
  boxHeaderEndpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  boxEndpointLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  boxFrame: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 6,
    gap: 6,
  },
  boxSegment: {
    flex: 1,
    height: 38,
    borderRadius: 6,
  },
  boxSegmentInactive: {
    backgroundColor: '#f1f5f9',
  },

  // Garis Pemisah
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },

  // Slider Section
  sliderSection: {
    width: '100%',
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  sliderValueBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  sliderValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706',
  },
  sliderTouchArea: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  sliderTrackBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderTrackActive: {
    height: 6,
    backgroundColor: '#f97316',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderEndpointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderEndpointText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    justifyContent: 'center',
  },
  presetPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Range BBM Input
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 0.3,
  },
  rangeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rangeInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 50,
    textAlign: 'right',
    paddingVertical: 2,
    paddingRight: 6,
  },
  rangeUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#d97706',
  },

  // Modal Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownOptionItemSelected: {
    backgroundColor: '#e0f2fe',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
    color: BrandColors.primary,
  },
});
