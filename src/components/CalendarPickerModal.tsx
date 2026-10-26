import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brand';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const parseDateParts = (dateStr?: string | null): Date => {
  if (!dateStr || !dateStr.trim()) return new Date();
  const clean = dateStr.trim().split(' ')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const formatDateToString = (day: number, month: number, year: number): string => {
  const dStr = String(day).padStart(2, '0');
  const mStr = String(month + 1).padStart(2, '0');
  return `${dStr}/${mStr}/${year}`;
};

export interface CalendarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: string | null;
  onSelectDate: (dateStr: string) => void;
  title?: string;
  subtitle?: string;
}

interface CalendarCardProps {
  selectedDate?: string | null;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  title: string;
  subtitle?: string;
}

const CalendarCard: React.FC<CalendarCardProps> = ({
  selectedDate,
  onClose,
  onSelectDate,
  title,
  subtitle,
}) => {
  const initialDate = parseDateParts(selectedDate);
  const [calYear, setCalYear] = useState(() => initialDate.getFullYear());
  const [calMonth, setCalMonth] = useState(() => initialDate.getMonth());

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const formatted = formatDateToString(day, calMonth, calYear);
    onSelectDate(formatted);
    onClose();
  };

  const handleQuickToday = () => {
    const now = new Date();
    const formatted = formatDateToString(now.getDate(), now.getMonth(), now.getFullYear());
    onSelectDate(formatted);
    onClose();
  };

  const handleQuickTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatted = formatDateToString(tomorrow.getDate(), tomorrow.getMonth(), tomorrow.getFullYear());
    onSelectDate(formatted);
    onClose();
  };

  return (
    <View style={styles.calendarModalContent}>
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>{title}</Text>
          {Boolean(subtitle) && (
            <Text style={styles.calendarModalSubtitle}>{subtitle}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <MaterialIcons name="close" size={22} color={BrandColors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Month & Year Navigator */}
      <View style={styles.calendarMonthNav}>
        <TouchableOpacity
          style={styles.navArrowBtn}
          onPress={handlePrevMonth}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={24} color={BrandColors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.calendarMonthTitle}>
          {MONTH_NAMES[calMonth]} {calYear}
        </Text>

        <TouchableOpacity
          style={styles.navArrowBtn}
          onPress={handleNextMonth}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-right" size={24} color={BrandColors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Day Names Header */}
      <View style={styles.dayNamesRow}>
        {DAY_NAMES.map((name, idx) => (
          <Text
            key={name}
            style={[
              styles.dayNameText,
              idx === 0 ? styles.sundayText : null,
            ]}
          >
            {name}
          </Text>
        ))}
      </View>

      {/* Calendar Days Rows (Strict 7-column layout per week row to prevent wrapping shift) */}
      {(() => {
        const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
        const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const allCells: React.ReactNode[] = [];

        // Empty cells sebelum tanggal 1
        for (let i = 0; i < firstDayIndex; i++) {
          allCells.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
        }

        const hasSelectedDate = Boolean(selectedDate && selectedDate.trim());
        const activeParsed = parseDateParts(selectedDate);
        const isCurrentMonthAndYear =
          hasSelectedDate &&
          activeParsed.getFullYear() === calYear &&
          activeParsed.getMonth() === calMonth;
        const activeDayNum = isCurrentMonthAndYear ? activeParsed.getDate() : -1;

        const today = new Date();
        const isThisMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;
        const todayDate = isThisMonth ? today.getDate() : -1;

        // Tanggal 1 s/d totalDaysInMonth
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const isSelected = day === activeDayNum;
          const isToday = day === todayDate;

          allCells.push(
            <TouchableOpacity
              key={`day-${day}`}
              style={styles.dayCell}
              activeOpacity={0.7}
              onPress={() => handleDayPress(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected ? styles.dayCircleSelected : null,
                  !isSelected && isToday ? styles.dayCircleToday : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    isSelected ? styles.dayCellTextSelected : null,
                    !isSelected && isToday ? styles.dayCellTextToday : null,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }

        // Genapkan selisih ke kelipatan 7
        const remainder = allCells.length % 7;
        if (remainder !== 0) {
          const padCount = 7 - remainder;
          for (let i = 0; i < padCount; i++) {
            allCells.push(<View key={`pad-${i}`} style={styles.dayCellEmpty} />);
          }
        }

        // Kelompokkan per minggu (7 kolom)
        const weeks = [];
        for (let i = 0; i < allCells.length; i += 7) {
          weeks.push(allCells.slice(i, i + 7));
        }

        return (
          <View style={styles.weeksContainer}>
            {weeks.map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.weekRow}>
                {week}
              </View>
            ))}
          </View>
        );
      })()}

      {/* Quick Actions (Hari Ini & Besok) */}
      <View style={styles.calendarQuickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleQuickToday}
          activeOpacity={0.75}
        >
          <MaterialIcons name="today" size={14} color={BrandColors.primary} />
          <Text style={styles.quickActionBtnText}>Hari Ini</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={handleQuickTomorrow}
          activeOpacity={0.75}
        >
          <MaterialIcons name="fast-forward" size={14} color={BrandColors.primary} />
          <Text style={styles.quickActionBtnText}>Besok</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'Pilih Tanggal',
  subtitle = 'Target: Mulai Pengambilan Unit',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayCenter}>
        {visible && (
          <CalendarCard
            key={`${selectedDate || 'empty'}`}
            selectedDate={selectedDate}
            onClose={onClose}
            onSelectDate={onSelectDate}
            title={title}
            subtitle={subtitle}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  calendarModalSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  calendarMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  sundayText: {
    color: BrandColors.error,
  },
  weeksContainer: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayCellEmpty: {
    flex: 1,
    height: 40,
  },
  dayCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: BrandColors.primary,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  dayCellText: {
    fontSize: 13,
    color: BrandColors.onSurface,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  calendarQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: BrandColors.primaryFixed,
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});
