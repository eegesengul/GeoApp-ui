import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Microsoft claim ve role için küçük harfe çevirip kontrol et
      const msRole = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if ((payload.role && payload.role.toLowerCase() === 'admin') ||
          (msRole && msRole.toLowerCase() === 'admin')) {
        return true;
      }
    } catch {}
  }
  router.navigate(['/map']);
  return false;
};