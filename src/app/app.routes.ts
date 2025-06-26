import { Routes } from '@angular/router';
import { MapComponent } from './map/map';
import { AuthComponent } from './auth/auth';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    // Giriş ve kayıt işlemlerinin yapılacağı sayfa.
    // Herkesin erişebilmesi için bu sayfada guard YOK.
    path: 'auth',
    component: AuthComponent
  },
  {
    // Harita sayfası.
    // Sadece giriş yapmış kullanıcıların erişebilmesi için authGuard ile korunuyor.
    path: 'map',
    component: MapComponent,
    canActivate: [authGuard] 
  },
  {
    // Kullanıcı uygulama adresine ilk girdiğinde (örn: localhost:4200)
    // onu harita sayfasına yönlendir. Guard burada devreye girip,
    // kullanıcı giriş yapmamışsa onu /auth sayfasına atacaktır.
    path: '',
    redirectTo: '/map',
    pathMatch: 'full'
  },
  {
    // Eğer kullanıcı var olmayan bir URL girerse (örn: localhost:4200/abcde)
    // onu yine harita sayfasına yönlendir. Guard yine görevini yapacaktır.
    path: '**',
    redirectTo: '/map'
  }
];