import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://localhost:7262/api';  

  constructor(private http: HttpClient) { }

  register(userInfo: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Auth/register`, userInfo).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
        }
      })
    );
  }

  kaydetAlan(alanVerisi: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Areas`, alanVerisi);
  }

  // ======================================================
  // YENİ EKLENEN FONKSİYON
  /**
   * Veritabanında kayıtlı tüm (yetkili olunan) alanları getirir.
   * Fonksiyonel interceptor'ınız sayesinde bu isteğe token otomatik eklenecektir.
   */
  getAlanlar(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Areas`);
  }
  // ======================================================
}