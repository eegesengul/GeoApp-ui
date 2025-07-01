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
  @Output() featureSelected = new EventEmitter<string>();

  isMenuOpen = false;

  constructor(private el: ElementRef) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  activateFeature(featureName: string): void {
    this.featureSelected.emit(featureName);
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isMenuOpen = false;
    }
  }
}