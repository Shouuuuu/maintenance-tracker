import { Injectable, signal, computed } from '@angular/core';
import { Motorcycle, MaintenanceTask, FuelLog,ServiceRecord, VehiclePart, PmsStatus } from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class Logbook {
private vehicleSignal = signal<Motorcycle | null>(null);
private taskSignal = signal<MaintenanceTask[]>([]);
private fuelLogSignal = signal<FuelLog[]>([]);
private serviceRecordSignal = signal<ServiceRecord[]>([]);
private partSignal = signal<VehiclePart[]>([]);

readonly vehicle =  this.vehicleSignal.asReadonly();
readonly tasks =  this.taskSignal.asReadonly();
readonly fuelLogs = this.fuelLogSignal.asReadonly();
readonly serviceRecords = this.serviceRecordSignal.asReadonly();
readonly parts = this.partSignal.asReadonly();

private readonly storageKey = 'maintenance_tracker_data';

constructor() {
  this.loadDataFromStorage();
}

private saveDataToStorage() {
  const data = {
    vehicle: this.vehicleSignal(),
    tasks: this.taskSignal(),
    fuelLogs: this.fuelLogSignal(),
    serviceRecords: this.serviceRecordSignal(),
    parts: this.partSignal(),
  };
  localStorage.setItem(this.storageKey, JSON.stringify(data));
}

private loadDataFromStorage() {
  const raw = localStorage.getItem(this.storageKey);
  if (!raw) return; 

  const data = JSON.parse(raw);
  if (data.vehicle) this.vehicleSignal.set(data.vehicle);
  if (data.tasks) this.taskSignal.set(data.tasks);
  if (data.fuelLogs) this.fuelLogSignal.set(data.fuelLogs);
  if (data.serviceRecords) this.serviceRecordSignal.set(data.serviceRecords);
  if (data.parts) this.partSignal.set(data.parts);
}
setMotorcycle(bike: Motorcycle) {
  this.vehicleSignal.set(bike);
  this.saveDataToStorage();
}

updateOdometer(newOdo: number) {
  const currentBike = this.vehicleSignal();
  if (!currentBike) return;

  this.vehicleSignal.set({
    ...currentBike,
    currentOdometer: newOdo,
  });
  this.saveDataToStorage();
}

addTask(task: MaintenanceTask) {
    const currentTasks = this.taskSignal();
    this.taskSignal.set([...currentTasks, task]);
    this.saveDataToStorage();
}

addFuelLog(log: FuelLog) {
  const currentLogs = this.fuelLogSignal();
  this.fuelLogSignal.set([log, ...currentLogs]);

  const currentBike = this.vehicleSignal();
  if (currentBike && log.odometer > currentBike.currentOdometer) {
    this.updateOdometer(log.odometer);
  } else {
    this.saveDataToStorage();
  }
}

addServiceRecord(record: ServiceRecord) {
    const currentRecords = this.serviceRecordSignal();
    this.serviceRecordSignal.set([...currentRecords, record]);
    this.saveDataToStorage();
}

addVehiclePart(part: VehiclePart) {
    const currentParts = this.partSignal();
    this.partSignal.set([...currentParts, part]);
    this.saveDataToStorage();
}

completeTask(
  taskId: string,
  doneOdometer: number,
  doneDate: string,
  cost: number,
  shopName: string,
  notes: string
) {
  const targetTask = this.taskSignal().find(t => t.id === taskId);
  if (!targetTask) return;

  this.taskSignal.update(tasks =>
    tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            lastDoneOdometer: doneOdometer,
            lastDoneDate: doneDate,
            notes: notes || t.notes,
          }
        : t
    )
  );

  this.addServiceRecord({
    id: crypto.randomUUID(),
    taskId,
    title: targetTask.name,
    date: doneDate,
    odometer: doneOdometer,
    cost,
    shopName,
    notes,
  });

  const currentBike = this.vehicleSignal();
  if (currentBike && doneOdometer > currentBike.currentOdometer) {
    this.updateOdometer(doneOdometer);
  }
}

getTaskStatus(task: MaintenanceTask): PmsStatus {
  const currentOdo = this.vehicleSignal()?.currentOdometer ?? task.lastDoneOdometer;
  const kmDriven = currentOdo - task.lastDoneOdometer;
  const kmRemaining = task.intervalKm - kmDriven;

  if (kmRemaining <= 0) return 'overdue';
  if (kmRemaining <= 300) return 'due-soon';
  return 'ok';
}

}
