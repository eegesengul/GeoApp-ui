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
import { Style, Fill, Stroke } from 'ol/style';
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
  
  private draw: Draw | null = null;
  private select: Select | null = null;
  private modify: Modify | null = null;
  private haritaTiklamaKey: EventsKey | null = null;

  public etkilesimModu: EtkilesimModu = 'none';
  public sonCizilenFeature: Feature<Geometry> | null = null;
  public alanName: string = '';
  public alanDescription: string = '';
  private cizilenGeoJsonString: string = '';

  public selectedFeatureInfo: { name: string, description: string } | null = null;
  public isInfoBoxVisible: boolean = false;

  public isAddPanelVisible: boolean = false;
  public isEditPanelVisible: boolean = false;
  private featureToEdit: Feature<Geometry> | null = null;
  public editName: string = '';
  public editDescription: string = '';
  private originalGeometryForEdit: Geometry | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const savedAreaStyle = new Style({ fill: new Fill({ color: 'rgba(255, 255, 0, 0.2)' }), stroke: new Stroke({ color: '#ffcc33', width: 2 }), });
    this.vectorSource = new VectorSource({ wrapX: false });
    const vectorLayer = new VectorLayer({ source: this.vectorSource, style: savedAreaStyle });
    this.map = new Map({ target: 'map', layers: [ new TileLayer({ source: new OSM() }), vectorLayer ], view: new View({ center: fromLonLat([35.2433, 38.9637]), zoom: 6 }) });
    
    this.loadExistingAreas();
    window.addEventListener('keydown', this.handleKeyDown.bind(this));

    this.map.on('click', (event) => {
      if (this.etkilesimModu !== 'none') return;
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature<Geometry>);
      this.zone.run(() => {
        if (feature && feature.get('name')) {
          this.selectedFeatureInfo = { name: feature.get('name'), description: feature.get('description'), };
          this.isInfoBoxVisible = true;
        } else {
          this.closeInfoBox();
        }
      });
    });
  }

  public closeInfoBox(): void {
    this.isInfoBoxVisible = false;
    this.selectedFeatureInfo = null;
  }

  onFeatureSelected(mod: string): void {
    this.closeInfoBox();
    this.etkilesimModunuDegistir(mod as EtkilesimModu);
  }

  etkilesimModunuDegistir(mod: EtkilesimModu): void {
    this.closeInfoBox();
    this.tumEtkilesimleriDurdur();
    this.etkilesimModu = mod;

    switch (mod) {
      case 'add-area': this.baslatCizim(); break;
      case 'edit-area': this.baslatDuzenleme(); break;
      case 'delete-area': this.baslatSilme(); break;
    }
  }

  tumEtkilesimleriDurdur(): void {
    this.iptalEtDuzenleme();
    this.cizimiIptalEt();
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.select) this.map.removeInteraction(this.select);
    if (this.modify) this.map.removeInteraction(this.modify);
    if (this.haritaTiklamaKey) { unByKey(this.haritaTiklamaKey); this.haritaTiklamaKey = null; }
    this.etkilesimModu = 'none';
  }

  baslatCizim(): void {
    this.draw = new Draw({ source: this.vectorSource, type: 'Polygon' });
    this.map.addInteraction(this.draw);

    this.draw.on('drawend', (event) => {
        this.zone.run(() => {
            this.sonCizilenFeature = event.feature;
            const geoJsonFormat = new GeoJSON();
            this.cizilenGeoJsonString = geoJsonFormat.writeFeature(this.sonCizilenFeature, {
                dataProjection: 'EPSG:4326',
                featureProjection: this.map.getView().getProjection()
            });
            if (this.draw) { this.map.removeInteraction(this.draw); }
            this.isAddPanelVisible = true;
            this.closeInfoBox();
        });
    });
  }

  baslatDuzenleme(): void {
    this.select = new Select({ style: new Style({ fill: new Fill({ color: 'rgba(255, 0, 0, 0.2)' }), stroke: new Stroke({ color: 'red', width: 3 }), }) });
    this.map.addInteraction(this.select);
    this.modify = new Modify({ features: this.select.getFeatures() });
    this.map.addInteraction(this.modify);

    this.select.on('select', (event) => {
        this.zone.run(() => {
            if (event.selected.length > 0) {
                this.featureToEdit = event.selected[0] as Feature<Geometry>;
                this.originalGeometryForEdit = this.featureToEdit.getGeometry()?.clone() ?? null;
                this.editName = this.featureToEdit.get('name') || '';
                this.editDescription = this.featureToEdit.get('description') || '';
                this.isEditPanelVisible = true;
                this.closeInfoBox();
            } else {
                this.iptalEtDuzenleme();
            }
        });
    });
  }

  baslatSilme(): void {
    this.haritaTiklamaKey = this.map.on('click', (event) => {
        this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
            const typedFeature = feature as Feature<Geometry>;
            const featureId = typedFeature.get('id');
            if (featureId && confirm(`'${typedFeature.get('name')}' adlı alanı silmek istediğinizden emin misiniz?`)) {
                this.apiService.deleteArea(featureId).subscribe({
                    next: () => this.zone.run(() => { if (this.vectorSource.hasFeature(typedFeature)) { this.vectorSource.removeFeature(typedFeature); } }),
                    error: (err) => alert('Alan silinirken bir hata oluştu.')
                });
            }
            return true;
        });
    });
  }
  
  loadExistingAreas(): void {
    this.apiService.getAreas().subscribe({
      next: (data) => {
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const geoJsonFormat = new GeoJSON();
          const features = geoJsonFormat.readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: this.map.getView().getProjection()
          });
          this.vectorSource.clear();
          this.vectorSource.addFeatures(features);
        } else {
          console.error("Hata: Sunucudan gelen alanlar verisi beklenen GeoJSON FeatureCollection formatında değil.", data);
          this.vectorSource.clear();
        }
      },
      error: (err) => console.error('Alanlar yüklenirken sunucu hatası oluştu:', err)
    });
  }

  public kaydetDuzenleme(): void {
    if (!this.featureToEdit || !this.editName) {
        alert('Alan adı boş bırakılamaz.');
        return;
    }

    const featureId = this.featureToEdit.get('id');
    const geometry = this.featureToEdit.getGeometry();

    if (!geometry) {
      alert('Alan geometrisi bulunamadı.');
      return;
    }
    
    const wktFormat = new WKT();
    const wktGeometry = wktFormat.writeGeometry(geometry, {
        dataProjection: 'EPSG:4326',
        featureProjection: this.map.getView().getProjection()
    });

    const areaData = {
        id: featureId,
        name: this.editName,
        description: this.editDescription,
        wktGeometry: wktGeometry
    };

    this.apiService.updateArea(featureId, areaData).subscribe({
        next: () => {
            this.zone.run(() => {
                this.featureToEdit?.set('name', this.editName);
                this.featureToEdit?.set('description', this.editDescription);
                
                this.isEditPanelVisible = false;
                this.featureToEdit = null;
                this.originalGeometryForEdit = null;
                this.select?.getFeatures().clear();
                this.editName = '';
                this.editDescription = '';

                this.tumEtkilesimleriDurdur();
            });
        },
        error: (err) => {
          console.error('Alan güncellenirken hata:', err);
          alert('Alan güncellenemedi. Sunucu tarafında bir hata oluşmuş olabilir. (Detaylar için konsolu kontrol edin)');
        }
    });
  }

  public iptalEtDuzenleme(): void {
    if (this.featureToEdit && this.originalGeometryForEdit) {
        this.featureToEdit.setGeometry(this.originalGeometryForEdit);
    }
    this.isEditPanelVisible = false;
    this.featureToEdit = null;
    this.originalGeometryForEdit = null;
    this.select?.getFeatures().clear();
    this.editName = '';
    this.editDescription = '';
  }
  
  public cizimiIptalEt(): void {
    if (this.sonCizilenFeature && !this.sonCizilenFeature.get('id')) {
      this.vectorSource.removeFeature(this.sonCizilenFeature);
    }
    this.isAddPanelVisible = false;
    this.sonCizilenFeature = null;
    this.cizilenGeoJsonString = '';
    this.alanName = '';
    this.alanDescription = '';
  }

  public alaniKaydet(): void {
    if (!this.alanName) { alert('Alan adı boş bırakılamaz.'); return; }
    if (!this.sonCizilenFeature) { alert('Kaydedilecek bir alan bulunamadı.'); return; }
    
    // GÜNCELLEME: `alaniKaydet` fonksiyonu, `CreateArea` endpoint'ine uyacak şekilde
    // `geoJsonGeometry` gönderecek şekilde düzeltildi.
    const areaData = { 
        name: this.alanName, 
        description: this.alanDescription, 
        geoJsonGeometry: this.cizilenGeoJsonString
    };

    this.apiService.createArea(areaData).subscribe({
      next: (yeniAlan) => this.zone.run(() => {
        this.sonCizilenFeature?.set('id', yeniAlan.id);
        this.sonCizilenFeature?.set('name', this.alanName);
        this.sonCizilenFeature?.set('description', this.alanDescription);
        this.cizimiIptalEt();
        this.tumEtkilesimleriDurdur();
      }),
      error: (err) => {
          console.error("Alan kaydedilemedi:", err);
          alert('Alan kaydedilemedi.');
      }
    });
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        this.zone.run(() => {
            if (this.isAddPanelVisible) { this.cizimiIptalEt(); }
            if (this.isEditPanelVisible) { this.iptalEtDuzenleme(); }
            this.closeInfoBox();
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