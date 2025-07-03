import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Router, ActivatedRoute } from '@angular/router'; // ActivatedRoute eklendi

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class AuthComponent implements OnInit {
  // isLoginMode yerine mode kullanıyoruz
  mode: 'login' | 'register' | 'forgotPassword' | 'resetPassword' = 'login';
  
  // Form alanları
  email = '';
  password = '';
  confirmPassword = '';
  username = '';
  fullName = ''; // Yeni alan
  
  // Mesajlar
  errorMessage = '';
  successMessage = '';

  // Şifre sıfırlama için
  private token: string | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute // Eklendi
  ) { }

  ngOnInit(): void {
    // Component yüklendiğinde URL'deki token ve email'i kontrol et
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      const email = params.get('email');
      
      if (token && email) {
        this.mode = 'resetPassword';
        this.token = token;
        this.email = email;
        // URL'den token'ı temizle ki yenileme durumunda tekrar okunmasın.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { token: null, email: null },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  setMode(newMode: 'login' | 'register' | 'forgotPassword' | 'resetPassword') {
    this.mode = newMode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    switch (this.mode) {
      case 'login':
        this.handleLogin();
        break;
      case 'register':
        this.handleRegister();
        break;
      case 'forgotPassword':
        this.handleForgotPassword();
        break;
      case 'resetPassword':
        this.handleResetPassword();
        break;
    }
  }

  private handleLogin() {
    const credentials = { email: this.email, password: this.password };
    this.apiService.login(credentials).subscribe({
      next: () => { this.router.navigate(['/map']); },
      error: (err) => { this.errorMessage = this.extractErrorMessage(err, 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'); }
    });
  }

  private handleRegister() {
    const userInfo = { fullName: this.fullName, userName: this.username, email: this.email, password: this.password };
    this.apiService.register(userInfo).subscribe({
      next: () => { this.router.navigate(['/map']); },
      error: (err) => { this.errorMessage = this.extractErrorMessage(err, 'Kayıt başarısız. Lütfen tüm alanları kontrol edin.'); }
    });
  }

  private handleForgotPassword() {
    this.apiService.forgotPassword({ email: this.email }).subscribe({
      next: (res: any) => {
        this.successMessage = res.message || 'Talep başarılıysa, şifre sıfırlama talimatları e-posta adresinize gönderilecektir.';
      },
      error: (err) => { this.errorMessage = this.extractErrorMessage(err, 'Bir hata oluştu.'); }
    });
  }

  private handleResetPassword() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Şifreler eşleşmiyor.';
      return;
    }
    if (!this.token) {
      this.errorMessage = 'Geçersiz veya eksik şifre sıfırlama anahtarı (token).';
      return;
    }
    const resetData = { email: this.email, token: this.token, newPassword: this.password, confirmPassword: this.confirmPassword };
    this.apiService.resetPassword(resetData).subscribe({
      next: (res: any) => {
        this.successMessage = res.message || 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.';
        this.mode = 'login';
        setTimeout(() => this.router.navigate(['/auth']), 3000); // 3 saniye sonra giriş ekranına yönlendir
      },
      error: (err) => { this.errorMessage = this.extractErrorMessage(err, 'Şifre sıfırlama başarısız oldu.'); }
    });
  }

  private extractErrorMessage(err: any, defaultMessage: string): string {
    if (err.error?.errors && Array.isArray(err.error.errors)) {
      return err.error.errors.join(' ');
    }
    if (err.error?.message) {
      return err.error.message;
    }
    return defaultMessage;
  }
}