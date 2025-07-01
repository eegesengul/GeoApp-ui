import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class AuthComponent implements OnInit {
  isLoginMode = true;
  email = '';
  password = '';
  username = '';
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.isLoginMode) {
      const credentials = { email: this.email, password: this.password };
      this.apiService.login(credentials).subscribe({
        next: () => { this.router.navigate(['/map']); },
        error: (err) => { this.errorMessage = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'; }
      });
    } else {
      const userInfo = { username: this.username, email: this.email, password: this.password };
      this.apiService.register(userInfo).subscribe({
        next: () => { this.router.navigate(['/map']); },
        error: (err) => { this.errorMessage = 'Kayıt başarısız. Bu e-posta zaten kullanılıyor olabilir.'; }
      });
    }
  }
}