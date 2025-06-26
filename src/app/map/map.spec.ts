import { ComponentFixture, TestBed } from '@angular/core/testing';

// DEĞİŞTİ: Artık 'Map' yerine, doğru component olan 'MapComponent' import ediliyor.
import { MapComponent } from './map';

// DEĞİŞTİ: describe bloğunun adı da standarda uygun olarak güncellendi.
describe('MapComponent', () => {
  // DEĞİŞTİ: Değişken tipleri doğru component adını kullanıyor.
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // DEĞİŞTİ: imports dizisinde doğru component kullanılıyor.
      imports: [MapComponent]
    })
    .compileComponents();

    // DEĞİŞTİ: Component, doğru adıyla oluşturuluyor.
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});