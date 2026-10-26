import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BookingDetail } from '@/services/booking';

export interface BookingInfoCardProps {
  booking: BookingDetail;
  mode: 'delivery' | 'return';
  currentKm?: string | number;
}

export const BookingInfoCard: React.FC<BookingInfoCardProps> = ({
  booking,
  mode,
  currentKm,
}) => {
  const customerName = booking.customer?.name || booking.customer_name || 'Pelanggan';
  const customerNik = booking.customer?.nik || booking.customer_nik || '-';
  const customerAddress = booking.customer?.address || '-';
  const customerPhone = booking.customer?.phone || booking.customer_phone || '-';

  const carName = booking.car?.name || booking.car_type || 'Unit Kendaraan';
  const plateNumber = booking.car?.plate_number || booking.plate_number || '-';
  const rentalType = booking.rental_type || 'Lepas Kunci';

  const locationTime =
    mode === 'delivery'
      ? `${booking.pickup_location || 'Pool'} (${booking.pickup_time ? booking.pickup_time.replace(/\s*WIB/i, '').trim() : '10:00'})`
      : `${booking.dropoff_location || booking.pickup_location || 'Pool'} (${booking.return_time ? booking.return_time.replace(/\s*WIB/i, '').trim() : '16:00'})`;

  const kmDisplay =
    currentKm !== undefined
      ? `${currentKm} KM`
      : mode === 'delivery'
        ? `${booking.car?.last_km ?? 0} KM`
        : `${booking.rental?.km_in ?? 0} KM`;

  return (
    <View style={styles.cardContainer}>
      {/* 1. PIHAK PENYEWA */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="person-outline" size={18} color="#1e293b" />
          <Text style={styles.sectionHeaderTitle}>PIHAK PENYEWA</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>Nama</Text>
          <Text style={styles.valueColBold}>{customerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>No. Identitas ( KTP/SIM )</Text>
          <Text style={styles.valueCol}>{customerNik}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>Alamat</Text>
          <Text style={styles.valueCol}>{customerAddress}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>No. Telpon Aktif</Text>
          <Text style={styles.valueColBold}>{customerPhone}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.labelCol}>Kelengkapan Penyewa</Text>
          <Text style={styles.valueColOrange}>KTP / SIM / Deposit Unit</Text>
        </View>
      </View>

      {/* Separator antara Pihak Penyewa & Data Unit */}
      <View style={styles.blockSeparator} />

      {/* 2. DATA UNIT ARMADA */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="directions-car" size={18} color="#1e293b" />
          <Text style={styles.sectionHeaderTitle}>DATA UNIT ARMADA</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>Nama Kendaraan</Text>
          <Text style={styles.valueColBold}>{carName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>No. Polisi (Plat)</Text>
          <View style={styles.plateBox}>
            <Text style={styles.plateText}>{plateNumber}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>Tipe Layanan</Text>
          <Text style={styles.valueColBold}>{rentalType}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.labelCol}>
            {mode === 'delivery' ? 'Jadwal & Lokasi Antar' : 'Jadwal & Lokasi Kembali'}
          </Text>
          <Text style={styles.valueColBold}>{locationTime}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.labelCol}>
            {mode === 'delivery' ? 'KM Keluar (Awal)' : 'KM Masuk (Kembali)'}
          </Text>
          <Text style={styles.valueColBold}>{kmDisplay}</Text>
        </View>
      </View>
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
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionBlock: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  blockSeparator: {
    height: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  labelCol: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  valueCol: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'right',
  },
  valueColBold: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
  },
  valueColOrange: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '700',
    textAlign: 'right',
  },
  plateBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
});
