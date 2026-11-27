import { Injectable, signal, computed } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  private readonly REMINDER_NOTIF_ID = 1001;
  private readonly DAILY_AUTO_KM = 25;

  private readonly _vehicles = signal<Motorcycle[]>([]);
  private readonly _selectedVehicleId = signal<string | null>(null);
  private readonly _tasks = signal<MaintenanceTask[]>([]);
  private readonly _fuelLogs = signal<FuelLog[]>([]);
  private readonly _serviceRecords = signal<ServiceRecord[]>([]);
  private readonly _parts = signal<VehiclePart[]>([]);

  // Optional banner message when 3+ days auto-estimate runs
  readonly autoSyncNotice = signal<string | null>(null);

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
    this.applyThreeDayAutoEstimate();
    this.scheduleInactivityReminder();
  }

  // --- 3-Day Auto Estimate (+25 km/day if idle >= 3 days) ---
  private applyThreeDayAutoEstimate() {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;
    let updatedCount = 0;

    this._vehicles.update((list) =>
      list.map((v) => {
        if (!v.lastOdometerUpdated) {
          return { ...v, lastOdometerUpdated: new Date(now).toISOString() };
        }
        const elapsedMs = now - new Date(v.lastOdometerUpdated).getTime();
        if (elapsedMs >= threeDaysMs) {
          const idleDays = Math.floor(elapsedMs / oneDayMs);
          const addedKm = idleDays * this.DAILY_AUTO_KM;
          updatedCount++;
          return {
            ...v,
            currentOdometer: v.currentOdometer + addedKm,
            lastOdometerUpdated: new Date(now).toISOString(),
          };
        }
        return v;
      })
    );

    if (updatedCount > 0) {
      this.saveToStorage();
      this.autoSyncNotice.set(
        `Auto-added +${this.DAILY_AUTO_KM} km/day after 3+ days without an odometer update.`
      );
    }
  }

  // --- 24-Hour Local Push Notification Reminder ---
  async scheduleInactivityReminder() {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;

      // Cancel previous 24h timer and reset it to 24 hours from now
      await LocalNotifications.cancel({ notifications: [{ id: this.REMINDER_NOTIF_ID }] });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.REMINDER_NOTIF_ID,
            title: 'MotoLog · Odometer Check',
            body: "Don't forget to update your ride's odometer today so your PMS alerts stay accurate!",
            schedule: { at: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          },
        ],
      });
    } catch {
      // Safe fallback when running in a standard desktop web browser
    }
  }

  // --- Garage & Vehicle Selection ---
  selectVehicle(vehicleId: string) {
    this._selectedVehicleId.set(vehicleId);
  }

  registerVehicle(bike: Motorcycle) {
    const stamped: Motorcycle = {
      ...bike,
      lastOdometerUpdated: new Date().toISOString(),
    };
    this._vehicles.update((list) => [stamped, ...list]);
    this.saveToStorage();
    this.scheduleInactivityReminder();
  }

  updateOdometer(vehicleId: string, newOdometer: number) {
    const nowIso = new Date().toISOString();
    this._vehicles.update((list) =>
      list.map((v) =>
        v.id === vehicleId && newOdometer >= v.currentOdometer
          ? { ...v, currentOdometer: newOdometer, lastOdometerUpdated: nowIso }
          : v
      )
    );
    this.saveToStorage();
    this.scheduleInactivityReminder();
  }

  // Quick one-tap increment (+10, +25, +50 km)
  incrementOdometer(vehicleId: string, deltaKm: number) {
    const bike = this._vehicles().find((v) => v.id === vehicleId);
    if (!bike || deltaKm <= 0) return;
    this.updateOdometer(vehicleId, bike.currentOdometer + deltaKm);
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

  // --- PMS Tasks ---
  addTask(task: MaintenanceTask) {
    this._tasks.update((list) => [task, ...list]);
    this.saveToStorage();
    this.scheduleInactivityReminder();
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
  }

  // --- Fuel Logs ---
  addFuelLog(log: FuelLog) {
    this._fuelLogs.update((list) => [log, ...list]);
    this.updateOdometer(log.vehicleId, log.odometer);
  }

  // --- Vehicle Parts ---
  addVehiclePart(part: VehiclePart) {
    this._parts.update((list) => [part, ...list]);
    this.updateOdometer(part.vehicleId, part.installedOdometer);
  }

  // --- LocalStorage Persistence ---
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
      // Ignore corrupt storage
    }
  }
}