import { Component, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class MenuComponent {
  // YENİ: Dışarıya 'featureName' (string) tipinde bir olay gönderecek olan EventEmitter'ı tanımlıyoruz.
  @Output() featureSelected = new EventEmitter<string>();

  isMenuOpen = false;

  constructor(private el: ElementRef) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isMenuOpen = false;
    }
  }

  // GÜNCELLEME: Bu fonksiyon artık sadece olayı dışarıya gönderecek.
  activateFeature(featureName: string | undefined): void {
    if (!featureName) return;

    // YENİ: Olayı, seçilen özelliğin adıyla ('add-area' veya 'view-areas') dışarıya gönderiyoruz.
    this.featureSelected.emit(featureName);
    
    // Menüdeki bir butona tıklandıktan sonra menüyü otomatik olarak kapat.
    this.isMenuOpen = false;
  }
}