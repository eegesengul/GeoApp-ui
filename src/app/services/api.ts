import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  kaydetAlan(alanVerisi: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Areas`, alanVerisi);
  }

  getAlanlar(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Areas`);
  }
}