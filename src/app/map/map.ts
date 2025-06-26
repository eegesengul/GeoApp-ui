import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import { Feature } from 'ol';
import { Style, Fill, Stroke } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
// WKT formatına çeviri için gerekli import
import WKT from 'ol/format/WKT';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuComponent } from '../menu/menu';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';
import { Geometry } from 'ol/geom';

type EtkilesimModu = 'add-area' | 'edit-area' | 'delete-area' | 'none';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy {
  map!: Map;
  vectorSource!: VectorSource;
  private draw!: Draw;
  private haritaTiklamaKey: EventsKey | null = null;
  public etkilesimModu: EtkilesimModu = 'none';
  public isModalVisible: boolean = false;
  public sonCizilenFeature: Feature<Geometry> | null = null;
  public alanName: string = '';
  public alanDescription: string = '';
  private cizilenGeoJsonString: string = '';
  private seciliFeature: Feature<Geometry> | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedAreaStyle = new Style({ fill: new Fill({ color: 'rgba(255, 255, 0, 0.2)' }), stroke: new Stroke({ color: '#ffcc33', width: 2 }), });
    this.vectorSource = new VectorSource({ wrapX: false });
    const vectorLayer = new VectorLayer({ source: this.vectorSource, style: savedAreaStyle });
    this.map = new Map({ target: 'map', layers: [ new TileLayer({ source: new OSM() }), vectorLayer ], view: new View({ center: fromLonLat([35.2433, 38.9637]), zoom: 6 }) });
    this.loadExistingAreas();
    // Klavye olaylarını dinlemek için genel bir dinleyici ekliyoruz.
    window.addEventListener('keydown', this.handleKeyDown);
  }

  kaydetButonunaBasildi(): void {
    if (this.cizilenGeoJsonString) { this.isModalVisible = true; } 
    else { alert("Lütfen önce bir alan çizin."); }
  }

  cizimiIptalEt(): void {
    if (this.sonCizilenFeature) { this.vectorSource.removeFeature(this.sonCizilenFeature); }
    this.tumEtkilesimleriDurdur();
  }

  baslatCizim(): void {
    this.draw = new Draw({ source: this.vectorSource, type: 'Polygon' });
    this.map.addInteraction(this.draw);
    this.draw.on('drawend', (event) => {
      this.sonCizilenFeature = event.feature;
      const format = new GeoJSON();
      this.cizilenGeoJsonString = format.writeFeature(this.sonCizilenFeature, { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' });
      this.map.removeInteraction(this.draw);
    });
  }

  onFeatureSelected(featureName: string): void {
    this.tumEtkilesimleriDurdur(); 
    this.etkilesimModu = featureName as EtkilesimModu;
    switch (this.etkilesimModu) {
      case 'add-area': this.baslatCizim(); break;
      case 'edit-area': alert('Düzenleme Modu: Lütfen haritadan düzenlemek istediğiniz bir alanı seçin.'); this.haritaTiklamaEtkilesiminiAyarla(); break;
      case 'delete-area': alert('Silme Modu: Lütfen haritadan silmek istediğiniz bir alanı seçin.'); this.haritaTiklamaEtkilesiminiAyarla(); break;
    }
  }

  alaniKaydet(): void {
    if (!this.alanName.trim()) { alert('Lütfen alan adı girin.'); return; }

    if (this.seciliFeature) { // Düzenleme Modu
      const featureId = this.seciliFeature.getId();
      const geometry = this.seciliFeature.getGeometry();

      if (!featureId || !geometry) {
        alert("Hata: Düzenlenecek alanın ID'si veya geometrisi bulunamadı.");
        return;
      }
      
      const wktFormat = new WKT();
      const wktGeometry = wktFormat.writeGeometry(geometry, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      });

      const updateData = {
        id: featureId.toString(),
        name: this.alanName,
        description: this.alanDescription,
        wktGeometry: wktGeometry
      };

      this.apiService.updateArea(featureId.toString(), updateData).subscribe({
        next: () => {
          alert('Alan başarıyla güncellendi!');
          this.loadExistingAreas();
          this.islemSonrasiTemizle();
        },
        error: (err) => { 
          console.error('Alan güncellenirken hata:', err); 
          alert('Alan güncellenirken bir hata oluştu. Lütfen konsolu kontrol edin.'); 
        }
      });
    } else { // Yeni Kayıt Modu
      if (!this.cizilenGeoJsonString) { alert('Kaydedilecek çizim verisi bulunamadı.'); return; }
      
      const createData = {
        name: this.alanName,
        description: this.alanDescription,
        geoJsonGeometry: this.cizilenGeoJsonString 
      };

      this.apiService.createArea(createData).subscribe({
        next: () => { 
            alert('Alan başarıyla kaydedildi!'); 
            this.loadExistingAreas();
            this.islemSonrasiTemizle();
        },
        error: (err) => { 
            console.error('Alan kaydedilirken hata:', err); 
            alert(`Alan kaydedilemedi. Hata: ${err.message}`); 
        }
      });
    }
  }

  loadExistingAreas(): void {
    this.apiService.getAreas().subscribe({
      next: (geoJsonData) => {
        this.vectorSource.clear();
        if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
          const format = new GeoJSON();
          const features = format.readFeatures(geoJsonData, { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' });
          features.forEach(feature => { const id = feature.get('id'); if (id) { feature.setId(id); } });
          this.vectorSource.addFeatures(features);
        }
      },
      error: (err) => {
        console.error('Alanlar yüklenirken hata oluştu:', err);
        if (err.status === 401) {
          alert('Oturum süreniz doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.');
          this.router.navigate(['/auth']);
        }
      }
    });
  }

  haritaTiklamaEtkilesiminiAyarla(): void {
    if (this.haritaTiklamaKey) return;
    this.haritaTiklamaKey = this.map.on('click', (event) => {
      this.map.forEachFeatureAtPixel(event.pixel, (featureLike) => {
        const feature = featureLike as Feature<Geometry>;
        if (feature.getId()) {
          this.seciliFeature = feature;
          if (this.etkilesimModu === 'delete-area') {
            this.alaniSil();
          } else if (this.etkilesimModu === 'edit-area') {
            this.duzenlemeModaliAc(feature);
          }
        }
        return true; 
      });
    });
  }

  alaniSil(): void {
    if (!this.seciliFeature) return;
    const featureId = this.seciliFeature.getId();
    if(!featureId) return;

    const featureName = this.seciliFeature.get('name') || `ID: ${featureId}`;
    if (confirm(`'${featureName}' alanını silmek istediğinizden emin misiniz?`)) {
      this.apiService.deleteArea(featureId.toString()).subscribe({
        next: () => { 
            alert('Alan başarıyla silindi.'); 
            this.loadExistingAreas(); 
            this.seciliFeature = null;
        },
        error: (err) => { 
            console.error('Alan silinirken hata:', err); 
            alert('Alan silinirken bir hata oluştu.'); 
        }
      });
    }
  }

  duzenlemeModaliAc(feature: Feature<Geometry>): void {
    this.seciliFeature = feature;
    this.alanName = feature.get('name') || '';
    this.alanDescription = feature.get('description') || '';
    this.isModalVisible = true;
  }

  tumEtkilesimleriDurdur(): void {
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.haritaTiklamaKey) { unByKey(this.haritaTiklamaKey); this.haritaTiklamaKey = null; }
    this.etkilesimModu = 'none';
    this.sonCizilenFeature = null;
    this.cizilenGeoJsonString = '';
    this.seciliFeature = null;
  }

  islemSonrasiTemizle(): void {
    this.isModalVisible = false;
    this.alanName = '';
    this.alanDescription = '';
    this.sonCizilenFeature = null;
    this.seciliFeature = null;
  }

  modaliKapat(): void {
    if(this.sonCizilenFeature) { this.vectorSource.removeFeature(this.sonCizilenFeature); }
    this.isModalVisible = false;
    this.alanName = '';
    this.alanDescription = '';
    this.tumEtkilesimleriDurdur();
  }

  logout(): void { 
    this.apiService.logout();
  }

  // **** YENİ FONKSİYON ****
  // Hem Escape hem de Backspace tuşlarını yöneten yeni, birleşik fonksiyon.
  handleKeyDown = (event: KeyboardEvent) => {
    // Escape tuşuna basıldığında
    if (event.key === 'Escape') {
      if (this.isModalVisible) {
        this.modaliKapat();
      } else {
        this.cizimiIptalEt();
      }
    } 
    // Backspace tuşuna basıldığında
    else if (event.key === 'Backspace') {
      // Sadece 'alan ekleme' modundaysak ve çizim etkileşimi aktifse çalışır.
      if (this.etkilesimModu === 'add-area' && this.draw) {
        // Tarayıcının bir önceki sayfaya gitmesini engelliyoruz.
        event.preventDefault();
        // Çizimdeki son noktayı kaldırıyoruz.
        this.draw.removeLastPoint();
      }
    }
  };

  ngOnDestroy(): void {
    // Component kaldırıldığında dinleyiciyi de kaldırıyoruz.
    window.removeEventListener('keydown', this.handleKeyDown);
    this.tumEtkilesimleriDurdur();
  }
}