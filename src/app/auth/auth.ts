import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Router, ActivatedRoute } from '@angular/router';

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
    private router: Router,
    private route: ActivatedRoute
  ) {
    // DEBUG: Component'in oluşturulup oluşturulmadığını kontrol et.
    console.log('AuthComponent constructor çalıştı!');
  }

  

  ngOnInit(): void {
    // DEBUG 1: ngOnInit'in tetiklenip tetiklenmediğini kontrol et.
    console.log('AuthComponent ngOnInit çalıştı!');

    this.route.queryParams.subscribe(params => {
      // DEBUG 2: Parametrelerin gelip gelmediğini ve içeriğini gör.
      console.log('URL parametreleri alındı:', params);

      if (params['loggedOut'] === 'true') {
        // DEBUG 3: 'if' bloğuna girilip girilmediğini kontrol et.
        console.log("'if' bloğuna girildi. Token şimdi silinmeli.");
        localStorage.removeItem('token');
        console.log('Token silindi (localStorage.removeItem çağrıldı).');
        
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { loggedOut: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

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