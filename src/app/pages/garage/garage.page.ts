import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonModal,
  IonIcon, IonButton, 
  IonTitle, IonButtons } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  bicycleOutline,
  carSportOutline,
  chevronForward,
  speedometerOutline,
  shieldCheckmark,
  warning,
  alertCircle,
} from 'ionicons/icons';
import { Logbook } from '../../services/logbook';
import { Motorcycle } from '../../models/vehicle.model';

@Component({
  selector: 'app-garage',
  templateUrl: './garage.page.html',
  styleUrl: './garage.page.scss',
  standalone: true,
  imports: [IonButtons, IonButton, 
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonModal,
    IonIcon,
    IonButton,
    IonTitle,
  ],
})
export class GaragePage {
  public logbook = inject(Logbook);
  private router = inject(Router);

  isRegisterModalOpen = false;

  nickname = '';
  brand = '';
  model = '';
  plateNumber = '';
  transmissionType: 'automatic' | 'manual' = 'automatic';
  vehicleType: 'motorcycle' | 'car' = 'motorcycle';
  currentOdometer: number | null = null;

  constructor() {
    addIcons({
      add,
      bicycleOutline,
      carSportOutline,
      chevronForward,
      speedometerOutline,
      shieldCheckmark,
      warning,
      alertCircle,
    });
  }

  openRegisterModal() {
    this.isRegisterModalOpen = true;
  }

  closeRegisterModal() {
    this.isRegisterModalOpen = false;
  }

  saveNewVehicle() {
    if (!this.nickname || !this.brand || !this.model || this.currentOdometer === null) return;

    const newBike: Motorcycle = {
      id: crypto.randomUUID(),
      nickname: this.nickname.trim(),
      brand: this.brand.trim(),
      model: this.model.trim(),
      plateNumber: this.plateNumber.trim().toUpperCase() || 'NO PLATE',
      transmissionType: this.transmissionType,
      vehicleType: this.vehicleType,
      currentOdometer: Number(this.currentOdometer),
    };

    this.logbook.registerVehicle(newBike);

    this.nickname = '';
    this.brand = '';
    this.model = '';
    this.plateNumber = '';
    this.transmissionType = 'automatic';
    this.vehicleType = 'motorcycle';
    this.currentOdometer = null;
    this.closeRegisterModal();
  }

  openVehicleDashboard(vehicleId: string) {
    this.logbook.selectVehicle(vehicleId);
    this.router.navigate(['/vehicle', vehicleId]);
  }
}