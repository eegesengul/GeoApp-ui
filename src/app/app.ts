import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map/map';
import { AuthComponent } from './auth/auth';
import { ApiService } from './services/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, AuthComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  private authSubscription!: Subscription;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.authSubscription = this.apiService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}