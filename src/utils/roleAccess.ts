import { UserProfile } from '@/services/storage';

export interface RoleAccessInfo {
  roles: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMarketing: boolean;
  isPeluncur: boolean;
  isDriver: boolean;
  isPetugasCuci: boolean;
  canAccessAllocation: boolean;
  canAccessCars: boolean;
  canAccessBookingList: boolean;
}

/**
 * Helper terpusat untuk mendeteksi hak akses dan perizinan role:
 * - Super Admin & Admin: Memiliki akses penuh ke seluruh modul
 * - Peluncur: Dibatasi HANYA pada tugas serah terima & pengembalian unit, DILARANG mengakses daftar booking, alokasi, & data mobil
 * - Marketing: Dibatasi pada reservasi/booking baru & tarif, DILARANG mengakses alokasi & data mobil
 */
export function getUserRoleInfo(user: UserProfile | null): RoleAccessInfo {
  const roles = (user?.roles || []).map((r) => String(r).toLowerCase().trim());
  const singleRole = (user as any)?.role ? String((user as any).role).toLowerCase().trim() : '';
  if (singleRole && !roles.includes(singleRole)) {
    roles.push(singleRole);
  }

  const isSuperAdmin = Boolean(
    user?.is_super_admin ||
    roles.includes('super admin') ||
    roles.includes('superadmin')
  );

  const isAdmin = Boolean(
    isSuperAdmin ||
    user?.is_admin ||
    roles.includes('admin')
  );

  const isMarketing = Boolean(
    !isAdmin && (
      user?.is_marketing ||
      roles.includes('marketing')
    )
  );

  const isPeluncur = Boolean(
    !isAdmin && (
      user?.is_peluncur ||
      roles.includes('peluncur')
    )
  );

  const isDriver = Boolean(
    !isAdmin && (
      user?.is_driver ||
      roles.includes('driver') ||
      roles.includes('supir')
    )
  );

  const isPetugasCuci = Boolean(
    !isAdmin && (
      user?.is_petugas_cuci ||
      roles.includes('petugas cuci') ||
      roles.includes('petugascuci')
    )
  );

  // Aturan Akses:
  // 1. Alokasi Armada: Hanya Admin & Super Admin
  const canAccessAllocation = isAdmin;

  // 2. Data Mobil / Armada: Peluncur dan Marketing DILARANG mengakses
  const canAccessCars = !isPeluncur && !isMarketing && (isAdmin || isPetugasCuci);

  // 3. Daftar Booking: Peluncur DILARANG melihat daftar booking (hanya serah terima & pengambilan)
  const canAccessBookingList = !isPeluncur;

  return {
    roles,
    isSuperAdmin,
    isAdmin,
    isMarketing,
    isPeluncur,
    isDriver,
    isPetugasCuci,
    canAccessAllocation,
    canAccessCars,
    canAccessBookingList,
  };
}
