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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy {
  map!: Map;
  vectorSource!: VectorSource;
  private draw!: Draw;
  sonCizilenFeature: Feature | null = null;
  private cizilenGeoJsonString: string = '';
  public isModalVisible: boolean = false;
  public alanName: string = '';
  public alanDescription: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedAreaStyle = new Style({
      fill: new Fill({ color: 'rgba(255, 255, 0, 0.2)' }),
      stroke: new Stroke({ color: '#ffcc33', width: 2 }),
    });

    this.vectorSource = new VectorSource({ wrapX: false });
    const vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: savedAreaStyle
    });

    this.map = new Map({
      target: 'map',
      layers: [ new TileLayer({ source: new OSM() }), vectorLayer ],
      view: new View({ center: fromLonLat([35.2433, 38.9637]), zoom: 6 })
    });

    this.loadExistingAreas();
    this.baslatCizim();
    window.addEventListener('keydown', this.handleEscKey);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.handleEscKey);
  }

  logout(): void {
    this.apiService.logout();
  }

  handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (this.isModalVisible) {
        this.modaliKapat();
      } else if (this.sonCizilenFeature) {
        this.cizimiIptalEt();
      }
    }
  };

  // DÜZELTME: Bu fonksiyon, backend'den gelen standart GeoJSON FeatureCollection'ı işleyecek şekilde güncellendi.
  loadExistingAreas(): void {
    this.apiService.getAlanlar().subscribe({
      next: (geoJsonData) => {
        this.vectorSource.clear(); // Haritayı temizle
        // Gelen verinin geçerli bir GeoJSON ve içinde çizimler (features) olup olmadığını kontrol et
        if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
          const format = new GeoJSON();
          // GeoJSON objesini direkt oku, .map() fonksiyonuna gerek yok
          const features = format.readFeatures(geoJsonData, {
            featureProjection: 'EPSG:3857', // Haritanın projeksiyonu
            dataProjection: 'EPSG:4326'    // Gelen verinin projeksiyonu (standart)
          });
          this.vectorSource.addFeatures(features); // Alanları haritaya ekle
        }
      },
      error: (err) => console.error('Alanlar yüklenirken hata oluştu:', err)
    });
  }

  baslatCizim(): void {
    this.draw = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
    });

    this.map.addInteraction(this.draw);

    this.draw.on('drawend', (event) => {
      this.sonCizilenFeature = event.feature;
      const format = new GeoJSON();
      // Çizilen alanı GeoJSON formatına çevir
      this.cizilenGeoJsonString = format.writeFeature(this.sonCizilenFeature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      });
      this.map.removeInteraction(this.draw);
    });
  }

  kaydetButonunaBasildi(): void {
    if (this.cizilenGeoJsonString) {
      this.isModalVisible = true;
    } else {
      alert("Lütfen önce bir alan çizin.");
    }
  }

  cizimiIptalEt(): void {
    if (this.sonCizilenFeature) {
      this.vectorSource.removeFeature(this.sonCizilenFeature);
      this.sonCizilenFeature = null;
      this.cizilenGeoJsonString = '';
      this.baslatCizim();
    }
  }

  modaliKapat(): void {
    this.isModalVisible = false;
    this.alanName = '';
    this.alanDescription = '';
  }

  alaniKaydet(): void {
    if (!this.alanName.trim()) {
      alert('Lütfen alan adı girin.');
      return;
    }

    if (!this.cizilenGeoJsonString) {
      alert('Kaydedilecek çizim verisi bulunamadı.');
      return;
    }

    this.apiService.kaydetAlan(this.alanName, this.alanDescription, this.cizilenGeoJsonString).subscribe({
      next: () => {
        alert('Alan başarıyla kaydedildi!');
        this.loadExistingAreas(); // Kayıttan sonra haritayı yenile

        this.modaliKapat();
        // Çizimle ilgili değişkenleri sıfırla ve yeni çizime izin ver
        this.sonCizilenFeature = null;
        this.cizilenGeoJsonString = '';
        this.baslatCizim();
      },
      error: (err) => {
        console.error('Alan kaydedilirken hata:', err);
        alert(`Alan kaydedilemedi. Hata: ${err.message}`);
      }
    });
  }
}