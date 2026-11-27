import { Injectable, signal, computed } from '@angular/core';
import {
  Motorcycle,
  MaintenanceTask,
  FuelLog,
  ServiceRecord,
  VehiclePart,
  PmsStatus,
} from '../models/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class Logbook {
  private readonly STORAGE_KEY = 'garage_logbook_v2';

  private readonly _vehicles = signal<Motorcycle[]>([]);
  private readonly _selectedVehicleId = signal<string | null>(null);
  private readonly _tasks = signal<MaintenanceTask[]>([]);
  private readonly _fuelLogs = signal<FuelLog[]>([]);
  private readonly _serviceRecords = signal<ServiceRecord[]>([]);
  private readonly _parts = signal<VehiclePart[]>([]);

  readonly vehicles = this._vehicles.asReadonly();
  readonly selectedVehicleId = this._selectedVehicleId.asReadonly();

  readonly activeVehicle = computed(() =>
    this._vehicles().find((v) => v.id === this._selectedVehicleId()) ?? null
  );

  readonly activeTasks = computed(() =>
    this._tasks().filter((t) => t.vehicleId === this._selectedVehicleId())
  );

  readonly activeFuelLogs = computed(() =>
    this._fuelLogs().filter((f) => f.vehicleId === this._selectedVehicleId())
  );

  readonly activeServiceRecords = computed(() =>
    this._serviceRecords().filter((r) => r.vehicleId === this._selectedVehicleId())
  );

  readonly activeParts = computed(() =>
    this._parts().filter((p) => p.vehicleId === this._selectedVehicleId())
  );

  readonly latestKmPerLiter = computed(() => {
    const logs = this.activeFuelLogs();
    if (logs.length < 2) return null;

    const distance = logs[0].odometer - logs[1].odometer;
    if (distance <= 0 || logs[0].liters <= 0) return null;

    return (distance / logs[0].liters).toFixed(1);
  });

  constructor() {
    this.loadFromStorage();
  }


  selectVehicle(vehicleId: string) {
    this._selectedVehicleId.set(vehicleId);
  }

  registerVehicle(bike: Motorcycle) {
    this._vehicles.update((list) => [bike, ...list]);
    this.saveToStorage();
  }

  updateOdometer(vehicleId: string, newOdometer: number) {
    this._vehicles.update((list) =>
      list.map((v) =>
        v.id === vehicleId && newOdometer >= v.currentOdometer
          ? { ...v, currentOdometer: newOdometer }
          : v
      )
    );
    this.saveToStorage();
  }

  getVehicleAlertCount(vehicleId: string): { overdue: number; dueSoon: number } {
    const vehicle = this._vehicles().find((v) => v.id === vehicleId);
    if (!vehicle) return { overdue: 0, dueSoon: 0 };

    const vehicleTasks = this._tasks().filter((t) => t.vehicleId === vehicleId);
    let overdue = 0;
    let dueSoon = 0;

    for (const task of vehicleTasks) {
      const status = this.getTaskStatus(task, vehicle.currentOdometer);
      if (status === 'overdue') overdue++;
      if (status === 'due-soon') dueSoon++;
    }

    return { overdue, dueSoon };
  }


  addTask(task: MaintenanceTask) {
    this._tasks.update((list) => [task, ...list]);
    this.saveToStorage();
  }

  getTaskStatus(task: MaintenanceTask, currentOdo?: number): PmsStatus {
    const odo = currentOdo ?? this.activeVehicle()?.currentOdometer ?? 0;
    const kmSinceLast = odo - task.lastDoneOdometer;
    const remainingKm = task.intervalKm - kmSinceLast;

    if (remainingKm <= 0) return 'overdue';
    if (remainingKm <= Math.max(200, task.intervalKm * 0.15)) return 'due-soon';
    return 'ok';
  }

  getRemainingKm(task: MaintenanceTask): number {
    const odo = this.activeVehicle()?.currentOdometer ?? 0;
    return task.intervalKm - (odo - task.lastDoneOdometer);
  }

  completeTask(taskId: string, odometer: number, date: string, cost: number, shopName: string, notes: string) {
    const task = this._tasks().find((t) => t.id === taskId);
    if (!task) return;

    this._tasks.update((list) =>
      list.map((t) =>
        t.id === taskId ? { ...t, lastDoneOdometer: odometer, lastDoneDate: date } : t
      )
    );

    const record: ServiceRecord = {
      id: crypto.randomUUID(),
      vehicleId: task.vehicleId,
      taskId: task.id,
      title: task.name,
      date,
      odometer,
      cost,
      shopName: shopName || 'Self / Home Garage',
      notes,
    };
    this._serviceRecords.update((list) => [record, ...list]);
    this.updateOdometer(task.vehicleId, odometer);
    this.saveToStorage();
  }



  addFuelLog(log: FuelLog) {
    this._fuelLogs.update((list) => [log, ...list]);
    this.updateOdometer(log.vehicleId, log.odometer);
    this.saveToStorage();
  }



  addVehiclePart(part: VehiclePart) {
    this._parts.update((list) => [part, ...list]);
    this.updateOdometer(part.vehicleId, part.installedOdometer);
    this.saveToStorage();
  }


  private saveToStorage() {
    const payload = {
      vehicles: this._vehicles(),
      tasks: this._tasks(),
      fuelLogs: this._fuelLogs(),
      serviceRecords: this._serviceRecords(),
      parts: this._parts(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
  }

  private loadFromStorage() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this._vehicles.set(data.vehicles ?? []);
      this._tasks.set(data.tasks ?? []);
      this._fuelLogs.set(data.fuelLogs ?? []);
      this._serviceRecords.set(data.serviceRecords ?? []);
      this._parts.set(data.parts ?? []);
    } catch {
  
    }
  }
}