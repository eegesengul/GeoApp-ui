import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // HTTP testleri için gerekli modülü içe aktar
import { ApiService } from './api'; // Doğru servis adını içe aktar: 'ApiService'

describe('ApiService', () => { // Test suitinin adını 'ApiService' olarak güncelle
  let service: ApiService; // service değişkeninin tipini 'ApiService' olarak düzelt

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule // HttpClient'ı test ortamında taklit etmek için bu modülü ekle
      ],
      providers: [
        ApiService // Test edilecek servisi sağlayıcılara ekle
      ]
    });
    service = TestBed.inject(ApiService); // Doğru servis adıyla servisi inject et
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});