import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// 'withInterceptorsFromDi' yerine 'withInterceptors' import edilecek
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// Oluşturduğumuz fonksiyonel interceptor'ı import ediyoruz
import { authInterceptor } from './auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), // Router provider'ını ekliyoruz

    // HttpClient'ı, bizim fonksiyonel interceptor'ımız ile birlikte "provide" ediyoruz
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};