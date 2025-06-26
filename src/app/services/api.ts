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

  // --- Auth Fonksiyonları (Değişiklik Yok) ---
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

  // --- Alan (Area) Fonksiyonları ---

  kaydetAlan(name: string, description: string, geoJson: string): Observable<any> {
    const alanVerisi = { name, description, geoJsonGeometry: geoJson };
    return this.http.post(`${this.baseUrl}/Areas`, alanVerisi, { headers: this.getAuthHeaders() });
  }

  getAlanlar(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Areas`, { headers: this.getAuthHeaders() });
  }

  deleteAlan(alanId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Areas/${alanId}`, { headers: this.getAuthHeaders() });
  }

  // *** NİHAİ DÜZELTME BURADA ***
  // Fonksiyon artık geoJson parametresi almıyor ve göndermiyor.
  updateAlan(alanId: string, name: string, description: string): Observable<any> {
    // Sadece adı ve açıklamayı içeren bir gövde (body) oluşturuluyor.
    const alanVerisi = { name, description };
    return this.http.put(`${this.baseUrl}/Areas/${alanId}`, alanVerisi, { headers: this.getAuthHeaders() });
  }
}