import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

interface Producto {
  Id: string;
  Nombre: string;
  Precio_publico: string;
  Imagen: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  datos: Producto[] = [];
  datosFiltrados: Producto[] = [];
  showModal = false;
  selectedProduct: Producto | null = null;
  isLoading = true;
  hayError = false;
  searchTerm = '';
  currentIndex = 0;

  private readonly WHATSAPP_NUMBER = '7711513192';

  /* Apps Script de bratz_boutique (devuelve JSON) */
  private readonly API_URL =
    'https://script.google.com/macros/s/AKfycbzhUmThtwlk681XED6BiXeqAaUApjImPd8jL5C8JE02U0oPVqUwJo46ucJ_7Wecw-MK/exec';

  whatsappGeneral =
    `https://wa.me/${this.WHATSAPP_NUMBER}?text=` +
    encodeURIComponent('Hola! Quiero informacion de Las Bratz Boutique');

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.isLoading = true;
    this.hayError = false;

    this.http.get<any[]>(`${this.API_URL}?t=${Date.now()}`).subscribe({
      next: (data) => {
        this.datos = this.normalizar(data);
        this.datosFiltrados = [...this.datos];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hayError = true;
      }
    });
  }

  /** Acepta encabezados en minuscula o con mayuscula inicial */
  private normalizar(data: any[]): Producto[] {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => ({
        Id:             String(item?.id ?? item?.Id ?? ''),
        Nombre:         String(item?.nombre ?? item?.Nombre ?? ''),
        Precio_publico: String(item?.precio_publico ?? item?.Precio_publico ?? item?.precio ?? ''),
        Imagen:         String(item?.imagen ?? item?.Imagen ?? '')
      }))
      .filter((p) => p.Nombre.trim() !== '')
      .reverse();
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.datosFiltrados = [...this.datos];
  }

  getWhatsAppLink(item: Producto): string {
    const msg = encodeURIComponent(
      `Hola! Estoy interesada en:\n` +
      `${item.Nombre}\n` +
      `Precio: $${item.Precio_publico}\n` +
      (item.Id ? `Codigo: #${item.Id}\n` : '') +
      `Esta disponible?`
    );
    return `https://wa.me/${this.WHATSAPP_NUMBER}?text=${msg}`;
  }

  openModal(item: Producto): void {
    this.currentIndex = this.datosFiltrados.indexOf(item);
    this.selectedProduct = item;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
    document.body.style.overflow = '';
  }

  prevProduct(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.selectedProduct = this.datosFiltrados[this.currentIndex];
    }
  }

  nextProduct(): void {
    if (this.currentIndex < this.datosFiltrados.length - 1) {
      this.currentIndex++;
      this.selectedProduct = this.datosFiltrados[this.currentIndex];
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.showModal) return;
    if (e.key === 'ArrowLeft')  this.prevProduct();
    if (e.key === 'ArrowRight') this.nextProduct();
    if (e.key === 'Escape')     this.closeModal();
  }

  /* ---------- helpers de búsqueda ---------- */

  /** minúsculas y sin acentos: "Ñoño Rosé" -> "nono rose" */
  private norm(v: any): string {
    return String(v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /** convierte "$1,250.00" -> 1250 ; si no hay número devuelve -1 */
  private precioNum(p: Producto): number {
    const n = parseFloat(String(p.Precio_publico).replace(/[^\d.]/g, ''));
    return isNaN(n) ? -1 : n;
  }

  /* ---------- buscador: nombre, código o precio ---------- */
  filtrarProductos(): void {
    const raw = this.searchTerm.trim();

    if (!raw) {
      this.datosFiltrados = [...this.datos];
      return;
    }

    const term = this.norm(raw);

    // 1) Código exacto:  #12   |   id 12   |   codigo 12
    const mId = term.match(/^(?:#|id|codigo)\s*[:\-]?\s*([a-z0-9]+)$/);
    if (mId) {
      this.datosFiltrados = this.datos.filter(p => this.norm(p.Id) === mId[1]);
      return;
    }

    // 2) Rango de precio:  100-300   |   100 a 300   |   100 hasta 300
    const mRango = term.match(/^\$?\s*(\d+(?:\.\d+)?)\s*(?:-|a|hasta)\s*\$?\s*(\d+(?:\.\d+)?)$/);
    if (mRango) {
      const min = Math.min(+mRango[1], +mRango[2]);
      const max = Math.max(+mRango[1], +mRango[2]);
      this.datosFiltrados = this.datos.filter(p => {
        const v = this.precioNum(p);
        return v >= min && v <= max;
      });
      return;
    }

    // 3) Máximo:  <200   |   menos de 200   |   hasta 200
    const mMenor = term.match(/^(?:<|menos de|hasta|max|maximo)\s*\$?\s*(\d+(?:\.\d+)?)$/);
    if (mMenor) {
      const max = +mMenor[1];
      this.datosFiltrados = this.datos.filter(p => {
        const v = this.precioNum(p);
        return v >= 0 && v <= max;
      });
      return;
    }

    // 4) Mínimo:  >200   |   +200   |   mas de 200   |   desde 200
    const mMayor = term.match(/^(?:>|\+|mas de|desde|min|minimo)\s*\$?\s*(\d+(?:\.\d+)?)$/);
    if (mMayor) {
      const min = +mMayor[1];
      this.datosFiltrados = this.datos.filter(p => this.precioNum(p) >= min);
      return;
    }

    // 5) Búsqueda general: cada palabra debe aparecer en nombre, código o precio
    const palabras = term.split(/\s+/).filter(Boolean);
    this.datosFiltrados = this.datos.filter(p => {
      const nombre = this.norm(p.Nombre);
      const id     = this.norm(p.Id);
      const precio = String(this.precioNum(p));
      const blob   = `${nombre} ${id} ${precio}`;
      return palabras.every(w => blob.includes(w.replace(/^[$#]/, '')));
    });
  }


  
}
