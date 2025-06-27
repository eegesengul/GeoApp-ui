import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
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
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuComponent } from '../menu/menu';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';
import { Geometry } from 'ol/geom';
import Select from 'ol/interaction/Select';
import Modify from 'ol/interaction/Modify';
import { click } from 'ol/events/condition';
import { transform } from 'ol/proj';

type EtkilesimModu = 'add-area' | 'edit-area' | 'delete-area' | 'add-point' | 'edit-point' | 'delete-point' | 'none';
type PanelType = 'info' | 'add' | 'edit' | null;
type FeatureType = 'area' | 'point';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy {
  map!: Map;
  areaVectorSource!: VectorSource;
  pointVectorSource!: VectorSource;
  private areaLayer!: VectorLayer<any>;
  private pointLayer!: VectorLayer<any>;

  private draw: Draw | null = null;
  private select: Select | null = null;
  private modify: Modify | null = null;
  private haritaTiklamaKey: EventsKey | null = null;

  public etkilesimModu: EtkilesimModu = 'none';
  public sonCizilenFeature: Feature<Geometry> | null = null;
  private cizilenGeoJsonString: string = '';

  public formName: string = '';
  public formDescription: string = '';

  public activePanel: PanelType = null;
  public isDrawingActive: boolean = false;

  public selectedFeatureInfo: { name: string, description: string, type: FeatureType } | null = null;
  private featureToEdit: Feature<Geometry> | null = null;
  private originalGeometryForEdit: Geometry | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const areaStyle = new Style({ fill: new Fill({ color: 'rgba(0, 123, 255, 0.2)' }), stroke: new Stroke({ color: '#007bff', width: 2 }) });
    this.areaVectorSource = new VectorSource({ wrapX: false });
    this.areaLayer = new VectorLayer({ source: this.areaVectorSource, style: areaStyle });

    const pointStyle = new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#28a745' }), stroke: new Stroke({ color: 'white', width: 2 }) }) });
    this.pointVectorSource = new VectorSource({ wrapX: false });
    this.pointLayer = new VectorLayer({ source: this.pointVectorSource, style: pointStyle });

    this.map = new Map({
      target: 'map',
      layers: [new TileLayer({ source: new OSM() }), this.areaLayer, this.pointLayer],
      view: new View({ center: fromLonLat([35.2433, 38.9637]), zoom: 6 })
    });
    
    this.loadExistingAreas();
    this.loadExistingPoints();
    window.addEventListener('keydown', this.handleKeyDown.bind(this));

    this.map.on('click', (event) => {
      if (this.etkilesimModu !== 'none') return;
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature<Geometry>);
      this.zone.run(() => {
        if (feature && feature.get('name')) {
          this.selectedFeatureInfo = {
            name: feature.get('name'),
            description: feature.get('description'),
            type: feature.get('feature_type')
          };
          this.activePanel = 'info';
        } else {
          this.closeActivePanel();
        }
      });
    });
  }
  
  // --- Panel ve Mod Yönetimi ---

  getPanelTitle(): string {
    const typeText = this.isAreaMode() ? 'Alan' : 'Nokta';
    switch (this.activePanel) {
      case 'info': return this.selectedFeatureInfo?.name || `${typeText} Bilgisi`;
      case 'add': return `Yeni ${typeText} Ekle`;
      case 'edit': return `${typeText} Düzenle`;
      default: return '';
    }
  }

  getPanelClass(): string {
    return this.activePanel ? `${this.activePanel}-panel` : '';
  }

   // YENİ: Haritanın sol altındaki mod durum metnini döndürür.
  public getModDurumuText(): string {
    switch (this.etkilesimModu) {
      case 'none':
        return 'Görüntüleme Modu';
      case 'add-area':
        return 'Mod: Alan Ekle';
      case 'edit-area':
        return 'Mod: Alan Düzenle';
      case 'delete-area':
        return 'Mod: Alan Sil';
      case 'add-point':
        return 'Mod: Nokta Ekle';
      case 'edit-point':
        return 'Mod: Nokta Düzenle';
      case 'delete-point':
        return 'Mod: Nokta Sil';
      default:
        return 'Görüntüleme Modu';
    }
  }

  getDrawingModeText(): string {
    return this.etkilesimModu.includes('area') ? 'Alan Çizimi' : 'Nokta Ekleme';
  }

  isAreaMode(): boolean {
    if (this.activePanel === 'info') return this.selectedFeatureInfo?.type === 'area';
    return this.etkilesimModu.includes('area');
  }

  onFeatureSelected(mod: string): void {
    this.etkilesimModunuDegistir(mod as EtkilesimModu);
  }

  etkilesimModunuDegistir(mod: EtkilesimModu): void {
    this.tumEtkilesimleriDurdur();
    this.etkilesimModu = mod;

    if (mod.includes('edit') || mod.includes('delete')) {
      if (mod.includes('area')) {
        this.pointLayer.setVisible(false);
      } else if (mod.includes('point')) {
        this.areaLayer.setVisible(false);
      }
    }

    switch (mod) {
      case 'add-area':    this.baslatCizim('Polygon'); break;
      case 'add-point':   this.baslatCizim('Point'); break;
      case 'edit-area':   this.baslatDuzenleme(this.areaVectorSource); break;
      case 'edit-point':  this.baslatDuzenleme(this.pointVectorSource); break;
      case 'delete-area': this.baslatSilme(this.areaVectorSource, 'area'); break;
      case 'delete-point':this.baslatSilme(this.pointVectorSource, 'point'); break;
    }
  }

  tumEtkilesimleriDurdur(): void {
    this.resetDuzenlemePaneli(); // DÜZENLEME: `iptalEtDuzenleme` yerine bu çağrılıyor.
    this.cizimiIptalEt();
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.select) this.map.removeInteraction(this.select);
    if (this.modify) this.map.removeInteraction(this.modify);
    if (this.haritaTiklamaKey) { unByKey(this.haritaTiklamaKey); this.haritaTiklamaKey = null; }
    
    if (this.areaLayer) this.areaLayer.setVisible(true);
    if (this.pointLayer) this.pointLayer.setVisible(true);

    this.etkilesimModu = 'none';
    this.isDrawingActive = false;
  }
  
  closeActivePanel(): void {
    if (this.activePanel === 'add') this.cizimiIptalEt();
    if (this.activePanel === 'edit') this.resetDuzenlemePaneli(); // DÜZENLEME: `iptalEtDuzenleme` yerine bu çağrılıyor.
    this.activePanel = null;
    this.selectedFeatureInfo = null;
  }

  // --- Çizim (Create) Fonksiyonları ---

  baslatCizim(type: 'Polygon' | 'Point'): void {
    const source = type === 'Polygon' ? this.areaVectorSource : this.pointVectorSource;
    this.draw = new Draw({ source, type });
    this.map.addInteraction(this.draw);
    this.isDrawingActive = true;

    this.draw.on('drawend', (event) => {
      this.zone.run(() => {
        this.sonCizilenFeature = event.feature;
        this.sonCizilenFeature.set('feature_type', type === 'Polygon' ? 'area' : 'point');
        const geoJsonFormat = new GeoJSON();
        this.cizilenGeoJsonString = geoJsonFormat.writeFeature(this.sonCizilenFeature, {
          dataProjection: 'EPSG:4326',
          featureProjection: this.map.getView().getProjection()
        });
        if (this.draw) this.map.removeInteraction(this.draw);
        this.isDrawingActive = false;
        this.activePanel = 'add';
      });
    });
  }

  geriAlSonNokta(): void {
    if (this.draw) this.draw.removeLastPoint();
  }

  cizimiIptalEt(): void {
    if (this.sonCizilenFeature && !this.sonCizilenFeature.get('id')) {
        const source = this.isAreaMode() ? this.areaVectorSource : this.pointVectorSource;
        source.removeFeature(this.sonCizilenFeature);
    }
    this.sonCizilenFeature = null;
    this.cizilenGeoJsonString = '';
    this.formName = '';
    this.formDescription = '';
  }

  baslatDuzenleme(source: VectorSource): void {
  // Varsa önceki interaction'ları kaldır
  if (this.select) this.map.removeInteraction(this.select);
  if (this.modify) this.map.removeInteraction(this.modify);

  const editStyle = new Style({
    fill: new Fill({ color: 'rgba(255, 0, 0, 0.3)' }),
    stroke: new Stroke({ color: 'red', width: 3 }),
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: 'rgba(255, 0, 0, 0.3)' }),
      stroke: new Stroke({ color: 'red', width: 2 })
    })
  });

  this.select = new Select({ style: editStyle });
  this.map.addInteraction(this.select);

  // DİKKAT: Modify interaction'ı EKLENMİYOR!

  this.select.on('select', (event) => {
    this.zone.run(() => {
      if (event.selected.length > 0) {
        const selectedFeature = event.selected[0] as Feature<Geometry>;

        if (source.hasFeature(selectedFeature)) {
          this.featureToEdit = selectedFeature;
          this.originalGeometryForEdit = selectedFeature.getGeometry()?.clone() ?? null;
          this.formName = selectedFeature.get('name') || '';
          this.formDescription = selectedFeature.get('description') || '';
          this.activePanel = 'edit';
        } else {
          this.select?.getFeatures().clear();
        }
      } else {
        this.closeActivePanel();
      }
    });
  });
}


  // DÜZENLEME: `iptalEtDuzenleme` fonksiyonunun adı daha açıklayıcı olması için `resetDuzenlemePaneli` olarak değiştirildi.
  // Bu fonksiyon artık hem düzenlemeyi iptal etmek hem de başarılı bir kayıttan sonra paneli temizlemek için kullanılıyor.
  resetDuzenlemePaneli(): void {
    if (this.featureToEdit && this.originalGeometryForEdit) {
      this.featureToEdit.setGeometry(this.originalGeometryForEdit);
    }
    this.activePanel = null; // Paneli kapat
    this.featureToEdit = null;
    this.originalGeometryForEdit = null;
    this.select?.getFeatures().clear(); // Seçimi temizle
    this.formName = '';
    this.formDescription = '';
  }

  // --- Silme (Delete) Fonksiyonları ---

  baslatSilme(source: VectorSource, type: FeatureType): void {
    alert(`${type === 'area' ? 'Alan' : 'Nokta'} silmek için haritadan bir nesne seçin.`);
    this.haritaTiklamaKey = this.map.on('click', (event) => {
      this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const typedFeature = feature as Feature<Geometry>;
        if (source.hasFeature(typedFeature)) {
          const featureId = typedFeature.get('id');
          if (featureId && confirm(`'${typedFeature.get('name')}' adlı nesneyi silmek istediğinizden emin misiniz?`)) {
            const deleteObservable = type === 'area' ? this.apiService.deleteArea(featureId) : this.apiService.deletePoint(featureId);
            deleteObservable.subscribe({
              // DÜZENLEME: Başarılı silme sonrası `tumEtkilesimleriDurdur` çağrısı kaldırıldı.
              // Artık silme modunda kalmaya devam edilecek.
              next: () => this.zone.run(() => { 
                source.removeFeature(typedFeature); 
                console.log("Nesne silindi. Silmeye devam edebilirsiniz.");
              }),
              error: (err) => alert('Nesne silinirken bir hata oluştu.')
            });
          }
          return true;
        }
        return false;
      });
    });
  }

  // --- API ile Kaydetme ve Yükleme ---

  handleSave(): void {
    if (this.activePanel === 'add') {
        this.isAreaMode() ? this.kaydetYeniAlan() : this.kaydetYeniNokta();
    } else if (this.activePanel === 'edit') {
        this.isAreaMode() ? this.kaydetAlanDuzenleme() : this.kaydetNoktaDuzenleme();
    }
  }

  kaydetYeniAlan(): void {
    if (!this.formName || !this.sonCizilenFeature) return;
    const areaData = { name: this.formName, description: this.formDescription, geoJsonGeometry: this.cizilenGeoJsonString };
    this.apiService.createArea(areaData).subscribe({
      next: (yeniAlan) => this.zone.run(() => {
        this.sonCizilenFeature?.set('id', yeniAlan.id);
        this.sonCizilenFeature?.set('name', this.formName);
        this.sonCizilenFeature?.set('description', this.formDescription);
        this.closeActivePanel();
        this.tumEtkilesimleriDurdur();
      }),
      error: (err) => alert('Alan kaydedilemedi.')
    });
  }

  kaydetAlanDuzenleme(): void {
  if (!this.featureToEdit || !this.formName) return;

  const featureId = this.featureToEdit.get('id');
  const geometry = this.featureToEdit.getGeometry();
  if (!geometry) return;

  // Geometriyi EPSG:3857'den EPSG:4326'ya dönüştür
  const clonedGeometry = geometry.clone();
  clonedGeometry.applyTransform((coords, output, dim = 2) => {
  for (let i = 0; i < coords.length; i += dim) {
    const [lon, lat] = transform([coords[i], coords[i + 1]], 'EPSG:3857', 'EPSG:4326');
    coords[i] = lon;
    coords[i + 1] = lat;
  }
  return coords;
});

  // Dönüştürülmüş geometriden WKT üret
  const wktFormat = new WKT();
  const wktGeometry = wktFormat.writeGeometry(clonedGeometry, {
    dataProjection: 'EPSG:4326'
  });

  const areaData = {
    id: featureId,
    name: this.formName,
    description: this.formDescription,
    wktGeometry
  };

  this.apiService.updateArea(featureId, areaData).subscribe({
    next: () => this.zone.run(() => {
      this.featureToEdit?.set('name', this.formName);
      this.featureToEdit?.set('description', this.formDescription);
      this.resetDuzenlemePaneli();
    }),
    error: (err) => alert('Alan güncellenemedi.')
  });
}



  kaydetYeniNokta(): void {
    if (!this.formName || !this.sonCizilenFeature) return;
    const pointData = { name: this.formName, description: this.formDescription, geoJsonGeometry: this.cizilenGeoJsonString };
    this.apiService.createPoint(pointData).subscribe({
      next: (yeniNokta) => this.zone.run(() => {
        this.sonCizilenFeature?.set('id', yeniNokta.id);
        this.sonCizilenFeature?.set('name', this.formName);
        this.sonCizilenFeature?.set('description', this.formDescription);
        this.closeActivePanel();
        this.tumEtkilesimleriDurdur();
      }),
      error: (err) => alert('Nokta kaydedilemedi.')
    });
  }

  kaydetNoktaDuzenleme(): void {
  if (!this.featureToEdit || !this.formName) return;
  const featureId = this.featureToEdit.get('id');
  // GEOMETRİ OLUŞTURMUYORUZ!
  const pointData = {
    id: featureId,
    name: this.formName,
    description: this.formDescription
    // geoJsonGeometry yok!
  };
  this.apiService.updatePoint(featureId, pointData).subscribe({
    next: () => this.zone.run(() => {
      this.featureToEdit?.set('name', this.formName);
      this.featureToEdit?.set('description', this.formDescription);
      this.resetDuzenlemePaneli();
    }),
    error: (err) => alert('Nokta güncellenemedi.')
  });
}

  loadExistingAreas(): void {
    this.apiService.getAreas().subscribe({
      next: (data) => {
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const geoJsonFormat = new GeoJSON();
          const features = geoJsonFormat.readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: this.map.getView().getProjection() });
          features.forEach(f => f.set('feature_type', 'area'));
          this.areaVectorSource.clear();
          this.areaVectorSource.addFeatures(features);
        }
      },
      error: (err) => console.error('Alanlar yüklenirken hata:', err)
    });
  }

  loadExistingPoints(): void {
    this.apiService.getPoints().subscribe({
      next: (data) => {
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const geoJsonFormat = new GeoJSON();
          const features = geoJsonFormat.readFeatures(data, { dataProjection: 'EPSG:4326', featureProjection: this.map.getView().getProjection() });
          features.forEach(f => f.set('feature_type', 'point'));
          this.pointVectorSource.clear();
          this.pointVectorSource.addFeatures(features);
        }
      },
      error: (err) => console.error('Noktalar yüklenirken hata:', err)
    });
  }

  // --- Yardımcı Fonksiyonlar ---
  
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.zone.run(() => {
        this.closeActivePanel();
        this.tumEtkilesimleriDurdur();
      });
    }
  }

  logout(): void { this.apiService.logout(); }
  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.tumEtkilesimleriDurdur();
  }
}