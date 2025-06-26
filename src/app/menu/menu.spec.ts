import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu'; // 'Menu' yerine 'MenuComponent' olarak düzeltildi

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent] // Bağımsız bileşenler için imports kullanılır
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});