import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
  IonIcon,
  AlertController, IonButton, IonItem } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  createOutline,
  trashOutline,
  flameOutline,
  constructOutline,
  layersOutline,
  speedometerOutline,
} from 'ionicons/icons';
import { Logbook } from '../../services/logbook';
import { MaintenanceTask, VehiclePart } from '../../models/vehicle.model';

@Component({
  selector: 'app-vehicle-detail',
  templateUrl: './vehicle-detail.page.html',
  styleUrl: './vehicle-detail.page.scss',
  standalone: true,
  imports: [IonItem, IonButton, 
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonModal,
    IonIcon,
  ],
})
export class VehicleDetailPage implements OnInit {
  public logbook = inject(Logbook);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  activeSection: 'pms' | 'fuel' | 'parts' = 'pms';

  // Modal states
  activeModal: 'odo' | 'fuel' | 'pms' | 'part' | null = null;

  // Odometer form
  newOdometer: number | null = null;

  // Fuel form
  fuelOdo: number | null = null;
  fuelLiters: number | null = null;
  fuelCost: number | null = null;

  // PMS Task form
  taskName = '';
  taskIntervalKm: number | null = null;
  editingTaskId: string | null = null;
  taskLastDoneOdo: number | null = null;

  // Part form
  partName = '';
  partCategory: VehiclePart['category'] = 'CVT / Drivetrain';
  partBrand = '';
  partCost: number | null = null;
  partNotes = '';

  constructor() {
    addIcons({
      checkmarkOutline,
      createOutline,
      trashOutline,
      flameOutline,
      constructOutline,
      layersOutline,
      speedometerOutline,
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.logbook.selectVehicle(id);
    }
    if (!this.logbook.activeVehicle()) {
      this.router.navigate(['/garage']);
    }
  }

  openModal(type: 'odo' | 'fuel' | 'pms' | 'part') {
    const currentOdo = this.logbook.activeVehicle()?.currentOdometer ?? null;
    if (type === 'odo') this.newOdometer = currentOdo;
    if (type === 'fuel') this.fuelOdo = currentOdo;
    if (type === 'pms') {
      this.editingTaskId = null;
      this.taskName = '';
      this.taskIntervalKm = null;
      this.taskLastDoneOdo = currentOdo;
    }
    this.activeModal = type;
  }

  openEditTaskModal(task: MaintenanceTask) {
    this.editingTaskId = task.id;
    this.taskName = task.name;
    this.taskIntervalKm = task.intervalKm;
    this.taskLastDoneOdo = task.lastDoneOdometer;
    this.activeModal = 'pms';
  }

  closeModal() {
    this.activeModal = null;
  }

  saveOdometer() {
    const bike = this.logbook.activeVehicle();
    if (!bike || this.newOdometer === null) return;
    this.logbook.updateOdometer(bike.id, Number(this.newOdometer));
    this.closeModal();
  }

  saveFuel() {
    const bike = this.logbook.activeVehicle();
    if (
      !bike ||
      this.fuelOdo === null ||
      this.fuelLiters === null ||
      this.fuelCost === null ||
      this.fuelLiters <= 0
    ) {
      return;
    }

    const litersNum = Number(this.fuelLiters);
    const totalNum = Number(this.fuelCost);

    this.logbook.addFuelLog({
      id: crypto.randomUUID(),
      vehicleId: bike.id,
      date: new Date().toISOString().split('T')[0],
      odometer: Number(this.fuelOdo),
      liters: litersNum,
      pricePerLiter: Number((totalNum / litersNum).toFixed(2)),
      totalCost: totalNum,
      isFullTank: true,
    });

    this.fuelLiters = null;
    this.fuelCost = null;
    this.closeModal();
  }

  savePmsTask() {
    const bike = this.logbook.activeVehicle();
    if (!bike || !this.taskName.trim() || !this.taskIntervalKm || this.taskIntervalKm <= 0) return;

    if (this.editingTaskId) {
      this.logbook.updateTask(this.editingTaskId, {
        name: this.taskName.trim(),
        intervalKm: Number(this.taskIntervalKm),
        lastDoneOdometer: Number(this.taskLastDoneOdo ?? bike.currentOdometer),
      });
    } else {
      this.logbook.addTask({
        id: crypto.randomUUID(),
        vehicleId: bike.id,
        name: this.taskName.trim(),
        intervalKm: Number(this.taskIntervalKm),
        intervalMonths: 3,
        lastDoneOdometer: Number(this.taskLastDoneOdo ?? bike.currentOdometer),
        lastDoneDate: new Date().toISOString().split('T')[0],
      });
    }

    this.editingTaskId = null;
    this.taskName = '';
    this.taskIntervalKm = null;
    this.taskLastDoneOdo = null;
    this.closeModal();
  }

  async markTaskDone(task: MaintenanceTask) {
    const bike = this.logbook.activeVehicle();
    if (!bike) return;

    const alert = await this.alertCtrl.create({
      header: 'Complete PMS Task?',
      subHeader: `${task.name} @ ${bike.currentOdometer.toLocaleString()} km`,
      message: 'This will reset the maintenance interval and add a record to your service history.',
      cssClass: 'garage-alert',
      inputs: [
        {
          name: 'cost',
          type: 'number',
          placeholder: 'Service cost in PHP (optional)',
        },
        {
          name: 'shopName',
          type: 'text',
          placeholder: 'Shop name (default: Self / Home Garage)',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm Done',
          role: 'confirm',
          handler: (data) => {
            const today = new Date().toISOString().split('T')[0];
            this.logbook.completeTask(
              task.id,
              bike.currentOdometer,
              today,
              Number(data?.cost || 0),
              data?.shopName?.trim() || 'Self / Home Garage',
              ''
            );
          },
        },
      ],
    });

    await alert.present();
  }

  async confirmDeleteTask(task: MaintenanceTask) {
    const alert = await this.alertCtrl.create({
      header: 'Remove PMS Task?',
      subHeader: task.name,
      message: 'This will remove this maintenance schedule from your vehicle.',
      cssClass: 'garage-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'confirm',
          handler: () => {
            this.logbook.deleteTask(task.id);
          },
        },
      ],
    });
    await alert.present();
  }

  savePart() {
    const bike = this.logbook.activeVehicle();
    if (!bike || !this.partName) return;

    this.logbook.addVehiclePart({
      id: crypto.randomUUID(),
      vehicleId: bike.id,
      partName: this.partName.trim(),
      category: this.partCategory,
      brand: this.partBrand.trim() || 'Stock / OEM',
      installedOdometer: bike.currentOdometer,
      installedDate: new Date().toISOString().split('T')[0],
      cost: Number(this.partCost ?? 0),
      notes: this.partNotes.trim(),
    });

    this.partName = '';
    this.partBrand = '';
    this.partCost = null;
    this.partNotes = '';
    this.closeModal();
  }

  getTaskProgress(task: MaintenanceTask): number {
    const odo = this.logbook.activeVehicle()?.currentOdometer ?? 0;
    const used = Math.max(0, odo - task.lastDoneOdometer);
    return Math.min(100, Math.round((used / task.intervalKm) * 100));
  }

  quickAddOdo(deltaKm: number, event: Event) {
    event.stopPropagation();
    const bike = this.logbook.activeVehicle();
    if (!bike) return;
    this.logbook.incrementOdometer(bike.id, deltaKm);
  }
}