import { Routes } from '@angular/router';
import { MapComponent } from './map/map';
import { AuthComponent } from './auth/auth';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard'; // <-- bunu ekle

export const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'map', component: MapComponent, canActivate: [authGuard] },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.AdminComponent),
    canActivate: [authGuard, adminGuard] // <-- burada iki guard birlikte olacak
  },
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: '**', redirectTo: '/map' }
];