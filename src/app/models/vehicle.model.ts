export type PmsStatus = 'ok' | 'due-soon' | 'overdue';

export interface Motorcycle {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  plateNumber: string;
  transmissionType: 'manual' | 'automatic';
  currentOdometer: number;
  vehicleType: 'motorcycle' | 'car';
}

export interface MaintenanceTask {
  id: string;
  vehicleId: string;
  name: string;
  intervalKm: number;
  intervalMonths: number;
  lastDoneOdometer: number;
  lastDoneDate: string;
  notes?: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  taskId?: string;
  title: string;
  date: string;
  odometer: number;
  cost: number;
  shopName: string;
  notes?: string;
}

export interface VehiclePart {
  id: string;
  vehicleId: string;
  partName: string;
  category: 'Engine' | 'Exhaust' | 'CVT / Drivetrain' | 'Brakes & Tires' | 'Electrical' | 'Other';
  brand: string;
  installedOdometer: number;
  installedDate: string;
  cost: number;
  notes?: string;
}