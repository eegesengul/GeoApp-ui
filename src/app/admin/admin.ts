import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  imports: [CommonModule, FormsModule]
})
export class AdminComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  editUsername = '';
  editEmail = '';
  editRole = '';

  // ARAMA PANELİ İÇİN EKLENDİ
  searchQuery: string = '';
  searchRole: string = '';

  constructor(
    public apiService: ApiService,
    private router: Router  
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.apiService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  // FİLTRELİ KULLANICI LİSTESİ
  get filteredUsers(): User[] {
    return this.users.filter(user => {
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