import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authToken = localStorage.getItem('token');

  let authReq = req;
  // Eğer token varsa, isteğin başlığına "Authorization" olarak ekle
  if (authToken) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`),
    });
  }

  // İsteği sunucuya gönder ve cevabı dinle
  return next(authReq).pipe(
    catchError((err) => {
      // Eğer sunucudan 401 (Unauthorized) hatası gelirse...
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // Geçersiz token'ı local storage'dan temizle
        localStorage.removeItem('token');
        // Kullanıcıyı giriş sayfasına yönlendirmek için sayfayı yeniden yükle.
        // Bu, uygulama durumunu sıfırlamanın en güvenli yoludur.
        location.reload();
      }
      // Diğer hatalar için hatayı olduğu gibi devam ettir
      return throwError(() => err);
    })
  );
};