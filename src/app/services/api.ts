import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://localhost:7262/api';
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());

  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // --- Auth Fonksiyonları ---
  register(userInfo: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Auth/register`, userInfo).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this.loggedIn.next(true);
        }
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this.loggedIn.next(true);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.loggedIn.next(false);
    this.router.navigate(['/auth']);
  }

  // --- Alan (Area) Fonksiyonları (İsimler standartlaştırıldı ve updateArea düzeltildi) ---

  createArea(areaData: { name: string, description: string, geometry: string }): Observable<any> {
    // Backend `geometry` beklediği için `geoJsonGeometry` ismini `geometry` olarak değiştirdim.
    // Eğer backend'de isim farklıysa, burayı ona göre güncelleyin.
    return this.http.post(`${this.baseUrl}/Areas`, areaData, { headers: this.getAuthHeaders() });
  }

  getAreas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Areas`, { headers: this.getAuthHeaders() });
  }

  deleteArea(areaId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Areas/${areaId}`, { headers: this.getAuthHeaders() });
  }

  /**
   * Alanı günceller.
   * @param areaId Güncellenecek alanın ID'si.
   * @param areaData Güncelleme verilerini içeren nesne (id, name, description içermeli).
   */
  updateArea(areaId: string, areaData: any): Observable<any> {
    // Gelen veri nesnesini (id içeren) doğrudan body olarak gönderiyoruz.
    // Bu, backend'deki id != command.Id kontrolünü geçmemizi sağlar.
    return this.http.put(`${this.baseUrl}/Areas/${areaId}`, areaData, { headers: this.getAuthHeaders() });
  }
}