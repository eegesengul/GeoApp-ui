import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, transform } from 'ol/proj';
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
import type { FeatureLike } from 'ol/Feature';
import { ScaleLine } from 'ol/control';

type EtkilesimModu = 'add-area' | 'edit-area' | 'delete-area' | 'add-point' | 'edit-point' | 'delete-point' | 'none';
type PanelType = 'info' | 'add' | 'edit' | null;
type FeatureType = 'area' | 'point';

interface CurrentUser {
  id: string;
  username: string;
  email: string;
  role?: string;
}

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
  public selectedFeatureId: string | null = null;
  
  private hoveredFeatureId: string | null = null;
  public currentZoom: number | undefined = 0;

  public contextMenuVisible = false;
  public contextMenuX = 0;
  public contextMenuY = 0;
  public contextMenuFeature: Feature<Geometry> | null = null;

  isProfileDropdownOpen = false;
  isProfileModalOpen = false;
  currentUser: CurrentUser | null = null;
  profileUsername = '';
  profileEmail = '';
  profilePassword = '';

  constructor(
    public apiService: ApiService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.areaVectorSource = new VectorSource({ wrapX: false });
    this.areaLayer = new VectorLayer({ 
      source: this.areaVectorSource, 
      style: feature => this.getFeatureStyle(feature)
    });

    this.pointVectorSource = new VectorSource({ wrapX: false });
    this.pointLayer = new VectorLayer({ 
      source: this.pointVectorSource, 
      style: feature => this.getFeatureStyle(feature)
    });

    this.map = new Map({
      target: 'map',
      layers: [new TileLayer({ source: new OSM() }), this.areaLayer, this.pointLayer],
      view: new View({ center: fromLonLat([35.2433, 38.9637]), zoom: 6 })
    });
    
    // GÜNCELLENDİ: Ölçek çizgisi kontrolünü oluştururken hedef div'i belirt
    const scaleControl = new ScaleLine({
      units: 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 140,
      target: 'scale-line-container' // Lejantı bu ID'ye sahip elementin içine çiz
    });
    this.map.addControl(scaleControl);

    this.currentZoom = this.map.getView().getZoom();
    this.map.getView().on('change:resolution', () => {
      this.zone.run(() => {
        this.currentZoom = this.map.getView().getZoom();
      });
    });

    this.loadExistingAreas();
    this.loadExistingPoints();
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.map.on('pointermove', (event) => {
      if (event.dragging) {
        return;
      }
      const pixel = this.map.getEventPixel(event.originalEvent);
      const feature = this.map.forEachFeatureAtPixel(pixel, f => f as Feature<Geometry>);
      const featureId = feature ? feature.get('id') : null;

      if (this.hoveredFeatureId !== featureId) {
        this.zone.run(() => {
          this.hoveredFeatureId = featureId;
          this.areaVectorSource.changed();
          this.pointVectorSource.changed();
        });
      }
    });

    this.map.on('click', (event) => {
      if (this.etkilesimModu !== 'none') return;
      this.contextMenuVisible = false;
      this.contextMenuFeature = null;
      this.selectedFeatureId = null;
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature<Geometry>);
      this.zone.run(() => {
        if (feature && feature.get('name')) {
          this.selectedFeatureInfo = {
            name: feature.get('name'),
            description: feature.get('description'),
            type: feature.get('feature_type') === 'area' ? 'area' : 'point'
          };
          this.selectedFeatureId = feature.get('id') ?? null;
          this.activePanel = 'info';
          this.areaVectorSource.changed();
          this.pointVectorSource.changed();
        } else {
          this.closeActivePanel();
        }
      });
    });

    this.map.getViewport().addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const pixel = this.map.getEventPixel(event);
      const feature = this.map.forEachFeatureAtPixel(pixel, f => f as Feature<Geometry>);
      this.zone.run(() => {
        if (feature) {
          this.contextMenuVisible = true;
          this.contextMenuX = event.clientX;
          this.contextMenuY = event.clientY;
          this.contextMenuFeature = feature;
          this.selectedFeatureId = feature.get('id');
          this.areaVectorSource.changed();
          this.pointVectorSource.changed();
        } else {
          this.contextMenuVisible = false;
          this.contextMenuFeature = null;
          this.selectedFeatureId = null;
          this.areaVectorSource.changed();
          this.pointVectorSource.changed();
        }
      });
    });

    document.addEventListener('click', this.closeContextMenuOnClick);
    document.addEventListener('click', this.closeProfileDropdownOnClick);
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('click', this.closeContextMenuOnClick);
    document.removeEventListener('click', this.closeProfileDropdownOnClick);
    this.tumEtkilesimleriDurdur();
  }

  closeProfileDropdownOnClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown-container')) {
      this.isProfileDropdownOpen = false;
    }
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }

  openProfileModal() {
    this.isProfileModalOpen = true;
    this.isProfileDropdownOpen = false;
  }

  closeContextMenuOnClick = (event: MouseEvent) => {
    if (this.contextMenuVisible) {
      this.zone.run(() => {
        this.contextMenuVisible = false;
        this.contextMenuFeature = null;
        this.selectedFeatureId = null;
        this.areaVectorSource.changed();
        this.pointVectorSource.changed();
      });
    }
  }

  onContextEdit() {
    if (!this.contextMenuFeature) return;
    const feature = this.contextMenuFeature;
    const isArea = feature.get('feature_type') === 'area';
    this.selectedFeatureId = feature.get('id');
    this.selectedFeatureInfo = {
      name: feature.get('name'),
      description: feature.get('description'),
      type: isArea ? 'area' : 'point'
    };
    this.contextMenuVisible = false;
    this.contextMenuFeature = null;
    this.editSelectedFeature();
  }

  onContextDelete() {
    if (!this.contextMenuFeature) return;
    const feature = this.contextMenuFeature;
    const isArea = feature.get('feature_type') === 'area';
    this.contextMenuVisible = false;
    this.contextMenuFeature = null;
    this.baslatSilme(
      isArea ? this.areaVectorSource : this.pointVectorSource,
      isArea ? 'area' : 'point',
      feature.get('id')
    );
  }

  getFeatureStyle(feature: FeatureLike): Style {
    const featureId = feature.get('id');
    const isSelected = featureId && featureId === this.selectedFeatureId;
    const isHovered = featureId && featureId === this.hoveredFeatureId;
    
    const isHighlighted = isSelected || isHovered;

    if (feature.get('feature_type') === 'area') {
      return new Style({
        stroke: new Stroke({
          color: isHighlighted ? '#FF0000' : '#007bff',
          width: isHighlighted ? 4 : 2
        }),
        fill: new Fill({
          color: isHighlighted ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 123, 255, 0.2)'
        })
      });
    } else {
      return new Style({
        image: new CircleStyle({
          radius: isHighlighted ? 10 : 7,
          fill: new Fill({ color: isHighlighted ? '#FF0000' : '#28a745' }),
          stroke: new Stroke({ color: '#fff', width: 2 })
        })
      });
    }
  }

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

  getDrawingModeText(): string {
    return this.etkilesimModu.includes('area') ? 'Alan Çizimi' : 'Nokta Ekleme';
  }

  isAreaMode(): boolean {
    if (this.activePanel === 'info' || this.activePanel === 'edit') {
      return this.selectedFeatureInfo?.type === 'area';
    }
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
    this.resetDuzenlemePaneli();
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
    if (this.activePanel === 'edit') this.resetDuzenlemePaneli();
    this.activePanel = null;
    this.selectedFeatureInfo = null;
    this.selectedFeatureId = null;
    this.areaVectorSource?.changed();
    this.pointVectorSource?.changed();
    this.contextMenuVisible = false;
    this.contextMenuFeature = null;
  }

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

    this.select.on('select', (event) => {
      this.zone.run(() => {
        if (event.selected.length > 0) {
          const selectedFeature = event.selected[0] as Feature<Geometry>;
          if (source.hasFeature(selectedFeature)) {
            this.featureToEdit = selectedFeature;
            this.originalGeometryForEdit = selectedFeature.getGeometry()?.clone() ?? null;
            this.formName = selectedFeature.get('name') || '';
            this.formDescription = selectedFeature.get('description') || '';
            this.selectedFeatureInfo = {
              name: selectedFeature.get('name'),
              description: selectedFeature.get('description'),
              type: selectedFeature.get('feature_type') === 'area' ? 'area' : 'point'
            };
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

  resetDuzenlemePaneli(): void {
    if (this.featureToEdit && this.originalGeometryForEdit) {
      this.featureToEdit.setGeometry(this.originalGeometryForEdit);
    }
    this.activePanel = null;
    this.featureToEdit = null;
    this.originalGeometryForEdit = null;
    this.select?.getFeatures().clear();
    this.formName = '';
    this.formDescription = '';
  }

  editSelectedFeature() {
    if (!this.selectedFeatureId || !this.selectedFeatureInfo) return;
    const isArea = this.selectedFeatureInfo.type === 'area';
    const source = isArea ? this.areaVectorSource : this.pointVectorSource;
    const feature = source.getFeatures().find(f => f.get('id') === this.selectedFeatureId);
    if (feature) {
      this.featureToEdit = feature;
      this.originalGeometryForEdit = feature.getGeometry()?.clone() ?? null;
      this.formName = feature.get('name') || '';
      this.formDescription = feature.get('description') || '';
      this.selectedFeatureInfo.type = isArea ? 'area' : 'point';
      this.activePanel = 'edit';
      this.contextMenuVisible = false;
      this.contextMenuFeature = null;
    }
  }

  deleteSelectedFeature() {
    if (!this.selectedFeatureId || !this.selectedFeatureInfo) return;
    if (confirm('Seçili alan/noktayı silmek istediğinizden emin misiniz?')) {
      if (this.selectedFeatureInfo.type === 'area') {
        this.baslatSilme(this.areaVectorSource, 'area', this.selectedFeatureId);
      } else {
        this.baslatSilme(this.pointVectorSource, 'point', this.selectedFeatureId);
      }
    }
  }

  baslatSilme(source: VectorSource, type: FeatureType, featureIdToDelete?: string): void {
    if (featureIdToDelete) {
      const feature = source.getFeatures().find(f => f.get('id') === featureIdToDelete);
      if (feature) {
        const name = feature.get('name');
        if (confirm(`'${name}' adlı nesneyi silmek istediğinizden emin misiniz?`)) {
          const deleteObservable = type === 'area' ? this.apiService.deleteArea(featureIdToDelete) : this.apiService.deletePoint(featureIdToDelete);
          deleteObservable.subscribe({
            next: () => this.zone.run(() => { 
              source.removeFeature(feature); 
              this.closeActivePanel();
            }),
            error: (err) => alert('Nesne silinirken bir hata oluştu.')
          });
        }
      }
      return;
    }
    alert(`${type === 'area' ? 'Alan' : 'Nokta'} silmek için haritadan bir nesne seçin.`);
    this.haritaTiklamaKey = this.map.on('click', (event) => {
      this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const typedFeature = feature as Feature<Geometry>;
        if (source.hasFeature(typedFeature)) {
          const featureId = typedFeature.get('id');
          if (featureId && confirm(`'${typedFeature.get('name')}' adlı nesneyi silmek istediğinizden emin misiniz?`)) {
            const deleteObservable = type === 'area' ? this.apiService.deleteArea(featureId) : this.apiService.deletePoint(featureId);
            deleteObservable.subscribe({
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
    const clonedGeometry = geometry.clone();
    clonedGeometry.applyTransform((coords, output, dim = 2) => {
      for (let i = 0; i < coords.length; i += dim) {
        const [lon, lat] = transform([coords[i], coords[i + 1]], 'EPSG:3857', 'EPSG:4326');
        coords[i] = lon;
        coords[i + 1] = lat;
      }
      return coords;
    });
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
    const pointData = {
      id: featureId,
      name: this.formName,
      description: this.formDescription
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

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.zone.run(() => {
        this.closeActivePanel();
        this.tumEtkilesimleriDurdur();
        this.contextMenuVisible = false;
        this.contextMenuFeature = null;
        this.selectedFeatureId = null;
      });
    }
  }
  
  get isAdminUser(): boolean {
    return this.apiService.isAdmin();
  }
  
  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  logout(): void { 
    this.apiService.logout(); 
  }

  loadCurrentUser() {
    this.apiService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.profileUsername = user.username;
      this.profileEmail = user.email;
    });
  }

  saveProfile() {
    if (!this.currentUser) return;
    const updated = {
      id: this.currentUser.id, 
      username: this.profileUsername,
      email: this.profileEmail,
      password: this.profilePassword || undefined
    };
    this.apiService.updateCurrentUser(updated).subscribe(() => {
      this.isProfileModalOpen = false;
      this.loadCurrentUser();
      this.profilePassword = '';
    });
  }
}