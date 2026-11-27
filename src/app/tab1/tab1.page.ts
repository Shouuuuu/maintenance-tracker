import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton, IonLabel, IonBadge, IonList } from '@ionic/angular';
import { Logbook } from '../services/logbook'; 

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonList, IonBadge, IonLabel, 
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
  ],
})
export class Tab1Page {
  public logbook = inject(Logbook);

  nickname = '';
  brand = '';
  model = '';
  plateNumber = '';
  currentOdometer: number | null = null;
  newOdometer: number | null = null;

  saveBike() {
    if (!this.nickname || !this.brand || this.currentOdometer === null) return;

    this.logbook.setMotorcycle({
      id: crypto.randomUUID(),
      nickname: this.nickname,
      brand: this.brand,
      model: this.model,
      plateNumber: this.plateNumber,
      transmissionType: 'automatic',
      currentOdometer: Number(this.currentOdometer),
      vehicleType: 'motorcycle',
    });
  }

updateOdo(){
  if(this.newOdometer !== null){
    this.logbook.updateOdometer(Number(this.newOdometer));
    this.newOdometer=null;
  }
}

newTaskName = '';
newTaskIntervalKm: number | null = null;

createTask() {
  if (!this.newTaskName || !this.newTaskIntervalKm) return;

  const currentOdo = this.logbook.vehicle()?.currentOdometer ?? 0;
  this.logbook.addTask({
    id: crypto.randomUUID(),
    name: this.newTaskName,
    intervalKm: Number(this.newTaskIntervalKm),
    intervalMonths: 3,
    lastDoneOdometer: currentOdo,
    lastDoneDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  this.newTaskName = '';
  this.newTaskIntervalKm = null;
}

markTaskDone(taskId: string) {
  const currentOdo = this.logbook.vehicle()?.currentOdometer ?? 0;
  const today = new Date().toISOString().split('T')[0];
  this.logbook.completeTask(taskId, currentOdo, today, 0, 'Self / Shop', '');
}

}