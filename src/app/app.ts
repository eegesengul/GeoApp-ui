import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map/map';
import { AuthComponent } from './auth/auth'; // Doğru import yolu (.component olmadan)

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, AuthComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  isLoggedIn = false;

  constructor() {
    const token = localStorage.getItem('token');
    this.isLoggedIn = !!token;
  }
}