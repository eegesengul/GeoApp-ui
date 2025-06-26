import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import { Router } from '@angular/router';

// OpenLayers Modülleri
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Fill, Stroke, Style } from 'ol/style';
import Feature from 'ol/Feature';

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

  // DÜZELTME: NgZone artık gerekli değil, constructor'dan kaldırıldı.
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
    // /auth sayfasına (lobiye) "loggedOut=true" (çıkış yapıyorum) mesajıyla git.
    this.router.navigate(['/auth'], { queryParams: { loggedOut: 'true' } });
  }
  
  handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (this.draw && this.draw.getActive()) {
        try { this.draw.removeLastPoint(); } 
        catch (e) { console.log("Silinecek başka nokta yok."); }
      }
    }
  }

  loadExistingAreas(): void {
    this.apiService.getAlanlar().subscribe({
      next: (geoJsonData) => {
        this.vectorSource.clear();
        if (geoJsonData?.features?.length > 0) {
          const features = new GeoJSON().readFeatures(geoJsonData, {
            dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'
          });
          this.vectorSource.addFeatures(features);
        }
      },
      error: (err) => console.error('Alanlar yüklenirken hata:', err)
    });
  }

  baslatCizim(): void {
    this.draw = new Draw({ source: this.vectorSource, type: 'Polygon' });
    this.map.addInteraction(this.draw);

    this.draw.on('drawend', (event) => {
      this.map.removeInteraction(this.draw);
      this.sonCizilenFeature = event.feature;
      this.cizilenGeoJsonString = new GeoJSON().writeFeatureObject(event.feature, {
        dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'
      });
    });
  }

  cizimiIptalEt(): void {
    if (this.sonCizilenFeature) {
      this.vectorSource.removeFeature(this.sonCizilenFeature);
    }
    this.sonCizilenFeature = null;
    this.cizilenGeoJsonString = '';
    this.baslatCizim();
  }

  kaydetButonunaBasildi(): void {
    this.isModalVisible = true;
  }
  
  iptalKayit(): void {
    this.isModalVisible = false;
    this.alanName = '';
    this.alanDescription = '';
    this.cizimiIptalEt();
  }

  onaylaVeKaydet(): void {
    if (!this.alanName.trim() || !this.alanDescription.trim()) {
        alert('Lütfen Alan Adı ve Açıklama alanlarını doldurun.');
        return;
    }
    const payload = {
      Name: this.alanName,
      Description: this.alanDescription,
      GeoJsonGeometry: this.cizilenGeoJsonString
    };
    this.apiService.kaydetAlan(payload).subscribe({
      next: () => {
        alert(`'${this.alanName}' adlı alan başarıyla kaydedildi!`);
        this.isModalVisible = false;
        this.alanName = '';
        this.alanDescription = '';
        this.sonCizilenFeature = null;
        this.cizilenGeoJsonString = '';
        this.loadExistingAreas();
        this.baslatCizim();
      },
      error: (err) => alert(`Alan kaydedilirken bir hata oluştu: ${err.message}`)
    });
  }
}