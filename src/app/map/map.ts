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

  loadExistingAreas(): void {
    this.apiService.getAlanlar().subscribe({
      next: (areas) => {
        if (areas && areas.features) {
          const format = new GeoJSON();
          const features = format.readFeatures(areas, {
            featureProjection: 'EPSG:3857'
          });
          this.vectorSource.addFeatures(features);
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
      this.cizilenGeoJsonString = format.writeFeature(this.sonCizilenFeature, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326'
      });
      this.map.removeInteraction(this.draw);
    });
  }

  kaydetButonunaBasildi(): void {
    this.isModalVisible = true;
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
    if (!this.alanName || !this.alanDescription) {
      alert('Lütfen alan adı ve açıklama girin.');
      return;
    }

    const alanVerisi = {
      name: this.alanName,
      description: this.alanDescription,
      geojson: this.cizilenGeoJsonString
    };

    this.apiService.kaydetAlan(alanVerisi).subscribe({
      next: (yeniAlan) => {
        if (yeniAlan) {
          const format = new GeoJSON();
          // DÜZELTME: readFeatures ve addFeatures kullanarak tür uyumluluğunu sağlıyoruz.
          const features = format.readFeatures(yeniAlan, {
              featureProjection: 'EPSG:3857'
          });
          this.vectorSource.addFeatures(features);
        }
        
        this.modaliKapat();
        this.sonCizilenFeature = null;
        this.baslatCizim();
      },
      error: (err) => {
        console.error('Alan kaydedilirken hata:', err);
        alert('Alan kaydedilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    });
  }
}