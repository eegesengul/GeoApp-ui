import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    // Eğer token varsa, kullanıcının sayfaya girmesine izin ver.
    // denicem router.navigate(['/map']);
    return true;
  } else {
    // Eğer token yoksa, kullanıcıyı '/auth' (giriş) sayfasına yönlendir.
    router.navigate(['/auth']);
    return false;
  }
};