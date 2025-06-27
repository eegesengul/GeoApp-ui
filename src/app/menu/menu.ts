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
  isAddOpen = false;
  isEditOpen = false;
  isDeleteOpen = false;

  constructor(private el: ElementRef) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;

    // Menü kapandığında alt grupları da kapat
    if (!this.isMenuOpen) {
      this.isAddOpen = false;
      this.isEditOpen = false;
      this.isDeleteOpen = false;
    }
  }

  toggleGroup(group: 'add' | 'edit' | 'delete') {
    this.isAddOpen = group === 'add' ? !this.isAddOpen : false;
    this.isEditOpen = group === 'edit' ? !this.isEditOpen : false;
    this.isDeleteOpen = group === 'delete' ? !this.isDeleteOpen : false;
  }

  activateFeature(featureName: string): void {
    this.featureSelected.emit(featureName);
    this.isMenuOpen = false;
    this.isAddOpen = false;
    this.isEditOpen = false;
    this.isDeleteOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isMenuOpen = false;
      this.isAddOpen = false;
      this.isEditOpen = false;
      this.isDeleteOpen = false;
    }
  }
}
