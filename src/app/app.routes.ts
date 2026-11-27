import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'garage',
    pathMatch: 'full',
  },
  {
    path: 'garage',
    loadComponent: () => import('./pages/garage/garage.page').then((m) => m.GaragePage),
  },
  {
    path: 'vehicle/:id',
    loadComponent: () => import('./pages/vehicle-detail/vehicle-detail.page').then((m) => m.VehicleDetailPage),
  },
];