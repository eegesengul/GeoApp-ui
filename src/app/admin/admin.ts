import { Component, OnInit } from '@angular/core';
import { ApiService, User, PagedResult } from '../services/api';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  imports: [CommonModule, FormsModule]
})
export class AdminComponent implements OnInit {
  // Kullanıcı yönetimi için değişkenler
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  editUsername = '';
  editEmail = '';
  editRole = '';

  // Arama ve filtreleme için değişkenler
  searchQuery: string = '';
  searchRole: string = '';

  // Sayfalama için değişkenler
  currentPage: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;
  totalUsers: number = 0;
  loading: boolean = false;

  constructor(
    public apiService: ApiService,
    private router: Router  
  ) {}

  ngOnInit() {
    // Önceki tercih varsa kullan
    const savedPageSize = localStorage.getItem('admin_pageSize');
    if (savedPageSize) {
      this.pageSize = parseInt(savedPageSize, 10);
    }
    
    this.loadUsers();
  }

  // Sayfalı kullanıcı yükleme
  loadUsers() {
    this.loading = true;
    this.apiService.getUsers(this.currentPage, this.pageSize).subscribe({
      next: (result: PagedResult<User>) => {
        this.users = result.items;
        this.totalUsers = result.totalCount;
        this.totalPages = result.totalPages;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users', error);
        this.loading = false;
      }
    });
  }

  // Filtreleme fonksiyonu
  applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const query = this.searchQuery.toLowerCase();
      const matchesQuery =
        !query ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole =
        !this.searchRole ||
        user.role.toLowerCase() === this.searchRole.toLowerCase();
      return matchesQuery && matchesRole;
    });
  }

  // Arama fonksiyonu
  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  // Sayfa boyutunu değiştirme fonksiyonu
  changePageSize(): void {
    this.currentPage = 1;
    localStorage.setItem('admin_pageSize', this.pageSize.toString());
    this.loadUsers();
  }

  // Sayfalama fonksiyonları
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  generatePageArray(): number[] {
    const pages: number[] = [];
    
    if (this.totalPages <= 7) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (this.currentPage > 3) {
        pages.push(-1);
      }
      
      const startPage = Math.max(2, this.currentPage - 1);
      const endPage = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (this.currentPage < this.totalPages - 2) {
        pages.push(-1);
      }
      
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  // Mevcut düzenleme ve silme fonksiyonları
  openEditModal(user: User) {
    this.selectedUser = { ...user };
    this.editUsername = user.username;
    this.editEmail = user.email;
    this.editRole = user.role;
    this.isEditModalOpen = true;
  }

  saveEdit() {
    if (!this.selectedUser) return;
    const updatedUser = {
      ...this.selectedUser,
      username: this.editUsername,
      email: this.editEmail,
      role: this.editRole
    };
    this.apiService.updateUser(updatedUser.id, updatedUser).subscribe(() => {
      this.isEditModalOpen = false;
      this.selectedUser = null;
      this.loadUsers();
    });
  }

  openDeleteModal(user: User) {
    this.selectedUser = user;
    this.isDeleteModalOpen = true;
  }

  confirmDelete() {
    if (!this.selectedUser) return;
    this.apiService.deleteUser(this.selectedUser.id).subscribe(() => {
      this.isDeleteModalOpen = false;
      this.selectedUser = null;
      this.loadUsers();
    });
  }

  goToMap() {
    this.router.navigate(['/map']);
  }
}